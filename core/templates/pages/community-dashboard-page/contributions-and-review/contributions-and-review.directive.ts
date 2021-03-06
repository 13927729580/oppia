// Copyright 2019 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Directive for showing and reviewing contributions.
 */

require('base-components/base-content.directive.ts');
require(
  'components/forms/schema-based-editors/schema-based-editor.directive.ts');
require(
  'components/question-directives/question-editor/' +
  'question-editor.directive.ts');
require('directives/angular-html-bind.directive.ts');
require('domain/question/QuestionObjectFactory.ts');
require('filters/format-rte-preview.filter.ts');
require('interactions/interactionsQuestionsRequires.ts');
require('objects/objectComponentsRequires.ts');
require(
  'pages/community-dashboard-page/login-required-message/' +
  'login-required-message.directive.ts');

require(
  'pages/community-dashboard-page/services/' +
  'contribution-and-review.service.ts');
require('services/alerts.service.ts');
require('services/suggestion-modal.service.ts');

angular.module('oppia').directive('contributionsAndReview', [
  'UrlInterpolationService', function(
      UrlInterpolationService) {
    return {
      restrict: 'E',
      scope: {},
      bindToController: {},
      templateUrl: UrlInterpolationService.getDirectiveTemplateUrl(
        '/pages/community-dashboard-page/contributions-and-review/' +
        'contributions-and-review.directive.html'),
      controllerAs: '$ctrl',
      controller: [
        '$filter', '$uibModal', 'AlertsService', 'ContributionAndReviewService',
        'QuestionObjectFactory', 'UserService',
        function(
            $filter, $uibModal, AlertsService, ContributionAndReviewService,
            QuestionObjectFactory, UserService) {
          var ctrl = this;
          var SUGGESTION_LABELS = {
            review: {
              text: 'Awaiting review',
              color: '#eeeeee'
            },
            accepted: {
              text: 'Accepted',
              color: '#8ed274'
            },
            rejected: {
              text: 'Rejected',
              color: '#e76c8c'
            }
          };

          var getQuestionContributionsSummary = function() {
            var questionContributionsSummaryList = [];
            Object.keys(ctrl.contributions).forEach(function(key) {
              var suggestion = ctrl.contributions[key].suggestion;
              var details = ctrl.contributions[key].details;
              var change = suggestion.change;
              var requiredData = {
                id: suggestion.suggestion_id,
                heading: $filter('formatRtePreview')(
                  change.question_dict.question_state_data.content.html),
                subheading: details.skill_description,
                labelText: SUGGESTION_LABELS[suggestion.status].text,
                labelColor: SUGGESTION_LABELS[suggestion.status].color,
                actionButtonTitle: (
                  ctrl.activeReviewTab === ctrl.SUGGESTION_TYPE_QUESTION ?
                    'Review' :
                    'View'
                )
              };
              questionContributionsSummaryList.push(requiredData);
            });
            return questionContributionsSummaryList;
          };

          var getTranslationContributionsSummary = function() {
            var translationContributionsSummaryList = [];
            Object.keys(ctrl.contributions).forEach(function(key) {
              var suggestion = ctrl.contributions[key].suggestion;
              var details = ctrl.contributions[key].details;
              var change = suggestion.change;
              var requiredData = {
                id: suggestion.suggestion_id,
                heading: $filter('formatRtePreview')(change.translation_html),
                subheading: (details.topic_name + ' / ' + details.story_title +
                  ' / ' + details.chapter_title),
                labelText: SUGGESTION_LABELS[suggestion.status].text,
                labelColor: SUGGESTION_LABELS[suggestion.status].color,
                actionButtonTitle: (
                  ctrl.activeReviewTab ===
                  ctrl.SUGGESTION_TYPE_TRANSLATE ?
                    'Review' :
                    'View'
                )
              };
              translationContributionsSummaryList.push(requiredData);
            });
            return translationContributionsSummaryList;
          };

          var resolveSuggestionSuccess = function(suggestionId) {
            AlertsService.addSuccessMessage('Submitted suggestion review.');
            ctrl.contributionSummaries = (
              ctrl.contributionSummaries.filter(function(suggestion) {
                if (suggestion.id === suggestionId) {
                  return false;
                }
                return true;
              }));
          };

          var _showQuestionSuggestionModal = function(
              suggestion, contributionDetails, reviewable) {
            var _templateUrl = UrlInterpolationService.getDirectiveTemplateUrl(
              '/pages/community-dashboard-page/modal-templates/' +
              'question-suggestion-review.directive.html');
            var targetId = suggestion.target_id;
            var suggestionId = suggestion.suggestion_id;
            var authorName = suggestion.author_name;
            var questionHeader = contributionDetails.skill_description;
            var question = QuestionObjectFactory.createFromBackendDict(
              suggestion.change.question_dict);
            var contentHtml = question.getStateData().content.getHtml();
            var skillRubrics = contributionDetails.skill_rubrics;
            var skillDifficulty = suggestion.change.skill_difficulty;

            $uibModal.open({
              templateUrl: _templateUrl,
              backdrop: true,
              size: 'lg',
              resolve: {
                authorName: function() {
                  return authorName;
                },
                contentHtml: function() {
                  return contentHtml;
                },
                question: function() {
                  return question;
                },
                questionHeader: function() {
                  return questionHeader;
                },
                reviewable: function() {
                  return reviewable;
                },
                skillRubrics: function() {
                  return skillRubrics;
                },
                skillDifficulty: function() {
                  return skillDifficulty;
                }
              },
              controller: [
                '$scope', '$uibModalInstance', 'SuggestionModalService',
                'question', 'reviewable', 'SKILL_DIFFICULTY_LABEL_TO_FLOAT',
                function($scope, $uibModalInstance, SuggestionModalService,
                    question, reviewable, SKILL_DIFFICULTY_LABEL_TO_FLOAT) {
                  const init = () => {
                    $scope.authorName = authorName;
                    $scope.contentHtml = contentHtml;
                    $scope.reviewable = reviewable;
                    $scope.reviewMessage = '';
                    $scope.question = question;
                    $scope.questionHeader = questionHeader;
                    $scope.questionStateData = question.getStateData();
                    $scope.questionId = question.getId();
                    $scope.canEditQuestion = false;
                    $scope.misconceptionsBySkill = [];
                    $scope.skillDifficultyLabel = getSkillDifficultyLabel();
                    $scope.skillRubricExplanation = getRubricExplanation(
                      $scope.skillDifficultyLabel);
                  };

                  $scope.questionChanged = function() {
                    $scope.validationError = null;
                  };

                  $scope.accept = function() {
                    SuggestionModalService.acceptSuggestion(
                      $uibModalInstance,
                      {
                        action: SuggestionModalService.ACTION_ACCEPT_SUGGESTION,
                        reviewMessage: $scope.reviewMessage,
                        skillDifficulty: skillDifficulty
                      });
                  };

                  $scope.reject = function() {
                    SuggestionModalService.rejectSuggestion(
                      $uibModalInstance,
                      {
                        action: SuggestionModalService.ACTION_REJECT_SUGGESTION,
                        reviewMessage: $scope.reviewMessage
                      });
                  };

                  $scope.cancel = function() {
                    SuggestionModalService.cancelSuggestion($uibModalInstance);
                  };

                  const getSkillDifficultyLabel = () => {
                    const skillDifficultyFloatToLabel = invertMap(
                      SKILL_DIFFICULTY_LABEL_TO_FLOAT);
                    return skillDifficultyFloatToLabel[skillDifficulty];
                  };

                  const getRubricExplanation = skillDifficultyLabel => {
                    for (const rubric of skillRubrics) {
                      if (rubric.difficulty === skillDifficultyLabel) {
                        return rubric.explanation;
                      }
                    }
                    return 'This rubric has not yet been specified.';
                  };

                  const invertMap = originalMap => {
                    return Object.keys(originalMap).reduce(
                      (invertedMap, key) => {
                        invertedMap[originalMap[key]] = key;
                        return invertedMap;
                      },
                      {}
                    );
                  };

                  init();
                }
              ]
            }).result.then(function(result) {
              ContributionAndReviewService.resolveSuggestiontoSkill(
                targetId, suggestionId, result.action, result.reviewMessage,
                result.skillDifficulty, resolveSuggestionSuccess);
            });
          };

          var _showTranslationSuggestionModal = function(
              targetId, suggestionId, contentHtml, translationHtml,
              reviewable) {
            var _templateUrl = UrlInterpolationService.getDirectiveTemplateUrl(
              '/pages/community-dashboard-page/modal-templates/' +
              'translation-suggestion-review.directive.html');

            $uibModal.open({
              templateUrl: _templateUrl,
              backdrop: true,
              size: 'lg',
              resolve: {
                translationHtml: function() {
                  return translationHtml;
                },
                contentHtml: function() {
                  return contentHtml;
                },
                reviewable: function() {
                  return reviewable;
                }
              },
              controller: [
                '$scope', '$uibModalInstance', 'SuggestionModalService',
                'reviewable', 'translationHtml', 'contentHtml',
                function($scope, $uibModalInstance, SuggestionModalService,
                    reviewable, translationHtml, contentHtml) {
                  $scope.translationHtml = translationHtml;
                  $scope.contentHtml = contentHtml;
                  $scope.reviewable = reviewable;
                  $scope.commitMessage = '';
                  $scope.reviewMessage = '';

                  $scope.accept = function() {
                    SuggestionModalService.acceptSuggestion(
                      $uibModalInstance,
                      {
                        action: SuggestionModalService.ACTION_ACCEPT_SUGGESTION,
                        commitMessage: $scope.commitMessage,
                        reviewMessage: $scope.reviewMessage
                      });
                  };

                  $scope.reject = function() {
                    SuggestionModalService.rejectSuggestion(
                      $uibModalInstance,
                      {
                        action: SuggestionModalService.ACTION_REJECT_SUGGESTION,
                        reviewMessage: $scope.reviewMessage
                      });
                  };
                  $scope.cancel = function() {
                    SuggestionModalService.cancelSuggestion($uibModalInstance);
                  };
                }
              ]
            }).result.then(function(result) {
              ContributionAndReviewService.resolveSuggestiontoExploration(
                targetId, suggestionId, result.action, result.reviewMessage,
                result.commitMessage, resolveSuggestionSuccess);
            });
          };

          ctrl.onClickViewSuggestion = function(suggestionId) {
            var suggestion = ctrl.contributions[suggestionId].suggestion;
            if (suggestion.suggestion_type === ctrl.SUGGESTION_TYPE_QUESTION) {
              var reviewable =
                ctrl.activeReviewTab === ctrl.SUGGESTION_TYPE_QUESTION;
              var contributionDetails =
                ctrl.contributions[suggestionId].details;
              _showQuestionSuggestionModal(
                suggestion, contributionDetails, reviewable);
            }
            if (suggestion.suggestion_type === ctrl.SUGGESTION_TYPE_TRANSLATE) {
              var reviewable =
                ctrl.activeReviewTab === ctrl.SUGGESTION_TYPE_TRANSLATE;
              _showTranslationSuggestionModal(
                suggestion.target_id, suggestion.suggestion_id,
                suggestion.change.content_html,
                suggestion.change.translation_html, reviewable);
            }
          };

          ctrl.switchToContributionsTab = function(suggestionType) {
            ctrl.activeReviewTab = '';
            ctrl.contributionsDataLoading = true;
            ctrl.contributionSummaries = [];
            if (suggestionType === ctrl.SUGGESTION_TYPE_QUESTION) {
              ctrl.activeContributionTab = ctrl.SUGGESTION_TYPE_QUESTION;
              ContributionAndReviewService.getUserCreatedQuestionSuggestions(
                function(suggestionIdToSuggestions) {
                  ctrl.contributions = suggestionIdToSuggestions;
                  ctrl.contributionSummaries = (
                    getQuestionContributionsSummary());
                  ctrl.contributionsDataLoading = false;
                });
            }
            if (suggestionType === ctrl.SUGGESTION_TYPE_TRANSLATE) {
              ctrl.activeContributionTab = ctrl.SUGGESTION_TYPE_TRANSLATE;
              ContributionAndReviewService
                .getUserCreatedTranslationSuggestions(
                  function(suggestionIdToSuggestions) {
                    ctrl.contributions = suggestionIdToSuggestions;
                    ctrl.contributionSummaries = (
                      getTranslationContributionsSummary());
                    ctrl.contributionsDataLoading = false;
                  });
            }
          };

          ctrl.switchToReviewTab = function(suggestionType) {
            ctrl.activeContributionTab = '';
            ctrl.contributionsDataLoading = true;
            ctrl.contributionSummaries = [];

            if (suggestionType === ctrl.SUGGESTION_TYPE_QUESTION) {
              ctrl.activeReviewTab = ctrl.SUGGESTION_TYPE_QUESTION;
              ContributionAndReviewService.getReviewableQuestionSuggestions(
                function(suggestionIdToSuggestions) {
                  ctrl.contributions = suggestionIdToSuggestions;
                  ctrl.contributionSummaries = (
                    getQuestionContributionsSummary());
                  ctrl.contributionsDataLoading = false;
                }
              );
            }
            if (suggestionType === ctrl.SUGGESTION_TYPE_TRANSLATE) {
              ctrl.activeReviewTab = ctrl.SUGGESTION_TYPE_TRANSLATE;
              ContributionAndReviewService
                .getReviewableTranslationSuggestions(
                  function(suggestionIdToSuggestions) {
                    ctrl.contributions = suggestionIdToSuggestions;
                    ctrl.contributionSummaries = (
                      getTranslationContributionsSummary());
                    ctrl.contributionsDataLoading = false;
                  });
            }
          };

          ctrl.$onInit = function() {
            ctrl.userDetailsLoading = true;
            ctrl.userIsLoggedIn = false;
            ctrl.contributions = {};
            ctrl.contributionSummaries = [];
            ctrl.contributionsDataLoading = true;
            ctrl.SUGGESTION_TYPE_QUESTION = 'add_question';
            ctrl.SUGGESTION_TYPE_TRANSLATE = 'translate_content';
            ctrl.activeReviewTab = '';
            ctrl.reviewTabs = [];
            ctrl.activeContributionTab = '';
            ctrl.contributionTabs = [
              {
                suggestionType: ctrl.SUGGESTION_TYPE_QUESTION,
                text: 'Questions'
              },
              {
                suggestionType: ctrl.SUGGESTION_TYPE_TRANSLATE,
                text: 'Translations'
              }
            ];
            UserService.getUserInfoAsync().then(function(userInfo) {
              ctrl.userIsLoggedIn = userInfo.isLoggedIn();
              ctrl.userDetailsLoading = false;
              if (ctrl.userIsLoggedIn) {
                UserService.getUserCommunityRightsData().then(
                  function(UserCommunityRights) {
                    var userCanReviewTranslationSuggestionsInLanguages = (
                      UserCommunityRights
                        .can_review_translation_for_language_codes);
                    var userCanReviewQuestionSuggestions = (
                      UserCommunityRights.can_review_questions);
                    if (userCanReviewQuestionSuggestions) {
                      ctrl.reviewTabs.push({
                        suggestionType: ctrl.SUGGESTION_TYPE_QUESTION,
                        text: 'Review Questions'
                      });
                    }
                    if (
                      userCanReviewTranslationSuggestionsInLanguages
                        .length > 0) {
                      ctrl.reviewTabs.push({
                        suggestionType: ctrl.SUGGESTION_TYPE_TRANSLATE,
                        text: 'Review Translations'
                      });
                    }
                    if (ctrl.reviewTabs.length > 0) {
                      ctrl.switchToReviewTab(ctrl.reviewTabs[0].suggestionType);
                    } else {
                      ctrl.switchToContributionsTab(
                        ctrl.SUGGESTION_TYPE_QUESTION);
                    }
                  });
              }
            });
          };
        }
      ]
    };
  }]);
