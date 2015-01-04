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
 * @fileoverview End-to-end testing utilities for the Text interaction.
 */

var objects = require('../../../objects/protractor.js');

var customizeInteraction = function(elem, placeholderText, heightOfBox) {
  objects.UnicodeStringEditor(
    elem.element(by.tagName('schema-based-unicode-editor'))
  ).setValue(placeholderText);
  objects.IntEditor(
    elem.element(by.tagName('schema-based-int-editor'))
  ).setValue(heightOfBox);
};

var expectInteractionDetailsToMatch = function(placeholderText, heightOfBox) {
  expect(
    element(by.tagName('oppia-interactive-text-input')).isPresent()
  ).toBe(true);
  // TODO (Jacob) add checks for the placeholder text and box height
};

var submitAnswer = function(answer) {
  element(by.tagName('oppia-interactive-text-input')).
    element(by.tagName('textarea')).sendKeys(answer);
  element(by.tagName('oppia-interactive-text-input')).
    element(by.tagName('button')).click();
};

var answerObjectType = 'NormalizedString';

var testSuite = [{
  interactionArguments: ['placeholder', 4],
  ruleArguments: ['StartsWith', 'valid'],
  expectedInteractionDetails: ['placeholder', 4],
  wrongAnswers: ['invalid'],
  correctAnswers: ['valid']
}];

exports.customizeInteraction = customizeInteraction;
exports.expectInteractionDetailsToMatch = expectInteractionDetailsToMatch;
exports.submitAnswer = submitAnswer;
exports.answerObjectType = answerObjectType;
exports.testSuite = testSuite;
