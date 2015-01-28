// Copyright 2014 The Oppia Authors. All Rights Reserved.
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
 * @fileoverview Controllers for the exploration overview tab in the exploration editor.
 *
 * @author sll@google.com (Sean Lip)
 */

oppia.controller('ExplorationOverview', [
    '$scope', 'graphDataService', 'routerService', 'editabilityService',
    function($scope, graphDataService, routerService, editabilityService) {

  $scope.hasTabLoaded = false;

  $scope.$on('refreshOverviewTab', function() {
    $scope.graphData = graphDataService.getGraphData();
    $scope.hasTabLoaded = true;
  });

  $scope.isEditable = editabilityService.isEditable;

  $scope.selectState = function(stateName) {
    if (stateName !== END_DEST) {
      routerService.navigateToMainTab(stateName);
    }
  };
}]);
