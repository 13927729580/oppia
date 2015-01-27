# Copyright 2014 The Oppia Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS-IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Controllers for the gallery pages."""

__author__ = 'sll@google.com (Sean Lip)'

import logging

from core.controllers import base
from core.domain import activity_jobs
from core.domain import config_domain
from core.domain import exp_domain
from core.domain import exp_services
from core.domain import rights_manager
from core.domain import user_services
from core.platform import models
current_user_services = models.Registry.import_current_user_services()
import feconf
import utils

import jinja2


EXPLORATION_ID_KEY = 'explorationId'

ALLOW_YAML_FILE_UPLOAD = config_domain.ConfigProperty(
    'allow_yaml_file_upload', 'Boolean',
    'Whether to allow file uploads via YAML in the gallery page.',
    default_value=False)

CONTRIBUTE_GALLERY_PAGE_ANNOUNCEMENT = config_domain.ConfigProperty(
    'contribute_gallery_page_announcement', 'Html',
    'An announcement to display on top of the contribute gallery page.',
    default_value='')

BANNER_ALT_TEXT = config_domain.ConfigProperty(
    'banner_alt_text', 'UnicodeString',
    'The alt text for the site banner image', default_value='')


def _get_short_language_description(full_language_description):
    if ' (' not in full_language_description:
        return full_language_description
    else:
        ind = full_language_description.find(' (')
        return full_language_description[:ind]


class GalleryPage(base.BaseHandler):
    """The exploration gallery page."""

    PAGE_NAME_FOR_CSRF = 'gallery'

    def get(self):
        """Handles GET requests."""
        self.values.update({
            'nav_mode': feconf.NAV_MODE_GALLERY,
            'allow_yaml_file_upload': ALLOW_YAML_FILE_UPLOAD.value,
            'gallery_login_redirect_url': (
                current_user_services.create_login_url(
                    feconf.GALLERY_LOGIN_REDIRECT_URL)),
            'gallery_register_redirect_url': utils.set_url_query_parameter(
                feconf.EDITOR_PREREQUISITES_URL,
                'return_url', feconf.GALLERY_CREATE_MODE_URL),
            'ALL_LANGUAGE_NAMES': [
                _get_short_language_description(lc['description'])
                for lc in feconf.ALL_LANGUAGE_CODES],
            'BANNER_ALT_TEXT': BANNER_ALT_TEXT.value,
        })
        self.render_template('galleries/gallery.html')


class GalleryHandler(base.BaseHandler):
    """Provides data for the exploration gallery page."""

    def get(self):
        """Handles GET requests."""
        # TODO(sll): Implement paging.

        # TODO(sll): Precompute and cache gallery categories. Or have a fixed
        # list of categories and 'Other', and gradually classify the
        # explorations in 'Other'.

        language_codes_to_short_descs = {
            lc['code']: _get_short_language_description(lc['description'])
            for lc in feconf.ALL_LANGUAGE_CODES
        }

        query_string = self.request.get('q')
        if query_string:
            # The user is performing a search.
            summaries_list = (
                exp_services.get_activity_summaries_matching_query(
                    query_string))
        else:
            # Load the default version of the gallery.
            summaries_list = (
                exp_services.get_non_private_activity_summaries())

        # TODO(msl): Store 'is_editable' in exploration summary to avoid O(n)
        # individual lookups. Note that this will depend on user_id.
        activities_list = [{
            'activity_type': summary.activity_type,
            'id': summary.id,
            'title': summary.title,
            'category': summary.category,
            'objective': summary.objective,
            'language': language_codes_to_short_descs.get(
                summary.language_code, summary.language_code),
            'last_updated': utils.get_time_in_millisecs(
                summary.activity_model_last_updated),
            'status': summary.status,
            'community_owned': summary.community_owned,
            'is_editable': summary.is_editable_by(self.user_id)
        } for summary in summaries_list]

        if len(activities_list) == feconf.DEFAULT_QUERY_LIMIT:
            logging.error(
                '%s activities were fetched to load the gallery page. '
                'You may be running up against the default query limits.'
                % feconf.DEFAULT_QUERY_LIMIT)

        public_activities_list = []
        featured_activities_list = []

        for a_dict in activities_list:
            if a_dict['status'] == feconf.ACTIVITY_STATUS_PUBLIC:
                public_activities_list.append(a_dict)
            elif a_dict['status'] == feconf.ACTIVITY_STATUS_PUBLICIZED:
                featured_activities_list.append(a_dict)

        public_activities_list = sorted(
            public_activities_list, key=lambda x: x['last_updated'],
            reverse=True)
        featured_activities_list = sorted(
            featured_activities_list, key=lambda x: x['last_updated'],
            reverse=True)

        self.values.update({
            'featured': featured_activities_list,
            'public': public_activities_list,
        })
        self.render_json(self.values)


class GalleryLoginRedirector(base.BaseHandler):
    """Redirects a logged-in user to the editor prerequisites page or the
    gallery, according as to whether they are logged in or not.
    """

    @base.require_user
    def get(self):
        """Handles GET requests."""
        if not user_services.has_user_registered_as_editor(self.user_id):
            redirect_url = utils.set_url_query_parameter(
                feconf.EDITOR_PREREQUISITES_URL,
                'return_url', feconf.GALLERY_CREATE_MODE_URL)
        else:
            redirect_url = feconf.GALLERY_CREATE_MODE_URL

        self.redirect(redirect_url)


class NewExploration(base.BaseHandler):
    """Creates a new exploration."""

    PAGE_NAME_FOR_CSRF = 'gallery'

    @base.require_registered_as_editor
    def post(self):
        """Handles POST requests."""
        title = self.payload.get('title')
        category = self.payload.get('category')
        objective = self.payload.get('objective')
        language_code = self.payload.get('language_code')

        if not title:
            raise self.InvalidInputException('No title supplied.')
        if not category:
            raise self.InvalidInputException('No category chosen.')
        if not language_code:
            raise self.InvalidInputException('No language chosen.')

        new_exploration_id = exp_services.get_new_exploration_id()
        exploration = exp_domain.Exploration.create_default_exploration(
            new_exploration_id, title, category,
            objective=objective, language_code=language_code)
        exp_services.save_new_exploration(self.user_id, exploration)

        self.render_json({EXPLORATION_ID_KEY: new_exploration_id})


class UploadExploration(base.BaseHandler):
    """Uploads a new exploration."""

    PAGE_NAME_FOR_CSRF = 'gallery'

    @base.require_registered_as_editor
    def post(self):
        """Handles POST requests."""
        title = self.payload.get('title')
        category = self.payload.get('category')
        yaml_content = self.request.get('yaml_file')

        if not title:
            raise self.InvalidInputException('No title supplied.')
        if not category:
            raise self.InvalidInputException('No category chosen.')

        new_exploration_id = exp_services.get_new_exploration_id()
        if ALLOW_YAML_FILE_UPLOAD.value:
            exp_services.save_new_exploration_from_yaml_and_assets(
                self.user_id, yaml_content, title, category,
                new_exploration_id, [])
            self.render_json({EXPLORATION_ID_KEY: new_exploration_id})
        else:
            raise self.InvalidInputException(
                'This server does not allow file uploads.')


class RecentCommitsHandler(base.BaseHandler):
    """Returns a list of recent commits."""

    def get(self):
        """Handles GET requests."""
        urlsafe_start_cursor = self.request.get('cursor')
        all_commits, new_urlsafe_start_cursor, more = (
            exp_services.get_next_page_of_all_non_private_commits(
                urlsafe_start_cursor=urlsafe_start_cursor))
        all_commit_dicts = [commit.to_dict() for commit in all_commits]
        self.render_json({
            'results': all_commit_dicts,
            'cursor': new_urlsafe_start_cursor,
            'more': more,
        })


class GalleryRedirectPage(base.BaseHandler):
    """An old exploration gallery page."""

    def get(self):
        """Handles GET requests."""
        self.redirect('/gallery')
