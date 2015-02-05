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
 * @fileoverview Controllers for the graphical state editor.
 *
 * @author sll@google.com (Sean Lip)
 */

oppia.controller('StateEditor', [
  '$scope', '$rootScope', 'editorContextService', 'changeListService',
  'editabilityService', 'explorationStatesService', 'routerService',
  'statesSequenceService',
  function(
    $scope, $rootScope, editorContextService, changeListService,
    editabilityService, explorationStatesService, routerService,
    statesSequenceService) {

  $scope.STATE_CONTENT_SCHEMA = {
    type: 'html',
    ui_config: {
      size: 'large'
    }
  };

  $scope.$on('refreshStateEditor', function() {
    $scope.initStateEditor();
  });

  $scope.initStateEditor = function() {
    $scope.stateName = editorContextService.getActiveStateName();

    var stateData = explorationStatesService.getState($scope.stateName);
    $scope.content = stateData.content;
    $scope.stateParamChanges = stateData.param_changes || [];

    // This should only be non-null when the content editor is open.
    $scope.contentMemento = null;

    var dominatorTrees = statesSequenceService.getDominatorTrees();
    $scope.nextStateName = dominatorTrees.reverseDoms[$scope.stateName];
    if ($scope.nextStateName == 'END' || $scope.nextStateName == $scope.stateName) {
      $scope.nextStateName = null;
    }
    $scope.nextStateContent = null;
    if ($scope.nextStateName !== null) {
      $scope.nextStateContent = explorationStatesService.getState(
        $scope.nextStateName).content[0].value;
    }

    $scope.previousStateName = dominatorTrees.forwardDoms[$scope.stateName];
    if ($scope.previousStateName == 'END' || $scope.previousStateName == $scope.stateName) {
      $scope.previousStateName = null;
    }
    $scope.previousStateContent = null;
    if ($scope.previousStateName !== null) {
      $scope.previousStateContent = explorationStatesService.getState(
        $scope.previousStateName).content[0].value;
    }

    if ($scope.stateName && stateData) {
      $rootScope.$broadcast('stateEditorInitialized', stateData);
    }
  };

  $scope.openStateContentEditor = function() {
    if (editabilityService.isEditable()) {
      $scope.contentMemento = angular.copy($scope.content);
    }
  };

  $scope.$on('externalSave', function() {
    $scope.saveTextContent();
  });

  $scope.saveTextContent = function() {
    if ($scope.contentMemento !== null && !angular.equals($scope.contentMemento, $scope.content)) {
      changeListService.editStateProperty(
        editorContextService.getActiveStateName(), 'content',
        angular.copy($scope.content), angular.copy($scope.contentMemento));

      var _stateData = explorationStatesService.getState(
        editorContextService.getActiveStateName());
      _stateData.content = angular.copy($scope.content);
      explorationStatesService.setState(
        editorContextService.getActiveStateName(), _stateData);
    }
    $scope.contentMemento = null;
  };

  $scope.cancelEdit = function() {
     var _stateData = explorationStatesService.getState(
       editorContextService.getActiveStateName());
     $scope.content = angular.copy(_stateData.content);
     $scope.contentMemento = null;
  };

  $scope.saveStateParamChanges = function(newValue, oldValue) {
    if (!angular.equals(newValue, oldValue)) {
      changeListService.editStateProperty(
        editorContextService.getActiveStateName(), 'param_changes',
        newValue, oldValue);

      var _stateData = explorationStatesService.getState(
        editorContextService.getActiveStateName());
      _stateData.param_changes = angular.copy(newValue);
      explorationStatesService.setState(
        editorContextService.getActiveStateName(), _stateData);
    }
  };

  $scope.navigateToState = function(stateName) {
    routerService.navigateToMainTab(stateName);
    $scope.initStateEditor();
  };
}]);
