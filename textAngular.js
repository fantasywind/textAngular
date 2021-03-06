/*
textAngular
Author : Austin Anderson, Chai Yu Pai
License : 2013 MIT
Version 1.1.4

See README.md for requirements and use.
*/

if(!window.console) console = {log: function() {}}; // fixes IE console undefined errors

var textAngular = angular.module("textAngular", ['ngSanitize']); //This makes ngSanitize required

textAngular.directive("textAngular", ['$compile', '$window', '$document', '$rootScope', '$timeout', function($compile, $window, $document, $rootScope, $timeout) {
	console.log("Thank you for using textAngular! http://www.textangular.com")

	// set default paragraph to <P>
	document.execCommand('defaultParagraphSeparator', false, 'p');

	// deepExtend instead of angular.extend in order to allow easy customization of "display" for default buttons
	// snatched from: http://stackoverflow.com/a/15311794/2966847
	function deepExtend(destination, source) {
		for (var property in source) {
			if (source[property] && source[property].constructor &&
				source[property].constructor === Object) {
				destination[property] = destination[property] || {};
				arguments.callee(destination[property], source[property]);
			} else {
				destination[property] = source[property];
			}
		}
		return destination;
	};
	// Here we set up the global display defaults, make sure we don't overwrite any that the user may have already set.
	$rootScope.textAngularOpts = deepExtend({
		toolbar: [['paragraph', 'subtitle', 'picture', 'calendar', 'vote'], ['fit']],
		classes: {
			focussed: "focussed",
			toolbar: "btn-toolbar",
			toolbarGroup: "btn-group",
			toolbarButton: "btn btn-default",
			toolbarButtonActive: "active",
			textEditor: 'form-control',
			htmlEditor: 'form-control'
		}
	}, ($rootScope.textAngularOpts != null)? $rootScope.textAngularOpts : {});
	// Setup the default toolbar tools, this way allows the user to add new tools like plugins
	var queryFormatBlockState = function(command){
		command = command.toLowerCase();
		var val = $document[0].queryCommandValue('formatBlock').toLowerCase();
		return val === command || val === command;
	}
	$rootScope.textAngularTools = deepExtend({
		paragraph: {
	    display: "<button ng-click='action()' ng-class='displayActiveToolClass(active)'><i class='fa fa-align-justify'></i> 段落</button>",
	    action: function() {
	      return this.$parent.wrapSelection('formatBlock', '<p>');
	    },
	    activeState: function() {
	      return queryFormatBlockState('p');
	    }
	  },
	  subtitle: {
	    display: "<button ng-click='action()' ng-class='displayActiveToolClass(active)'><i class='fa fa-font'></i> 小標</button>",
	    action: function() {
	      return this.$parent.wrapSelection('formatBlock', '<h2>');
	    },
	    activeState: function() {
	      return queryFormatBlockState('h2');
	    }
	  },
	  picture: {
	    display: "<button ng-click='action()' ng-class='displayActiveToolClass(active)'><i class='fa fa-picture-o'></i> 照片</button>",
	    action: function() {
	      var selector;
	      this.$parent.wrapSelection('formatBlock', '<image-gallery>');
	      $rootScope.$broadcast('showPhotoSelector', this);
	      //selector = angular.element('<photo-selector></photo-selector>');
	      //return this.$parent.displayElements.toolbar.after(selector);
	    },
	    activeState: function() {
	      return queryFormatBlockState('image-gallery');
	    }
	  },
	  calendar: {
	    display: "<button ng-click='action()' ng-class='displayActiveToolClass(active)'><i class='fa fa-calendar'></i> 日期</button>",
	    action: function() {
	      var selector;
	      this.$parent.wrapSelection('formatBlock', '<event-calendar>');
	    },
	    activeState: function() {
	      return queryFormatBlockState('event-calendar');
	    }
	  },
	  vote: {
	    display: "<button ng-click='action()' ng-class='displayActiveToolClass(active)'><i class='fa fa-bar-chart-o'></i> 投票</button>",
	    action: function() {
	      var selector;
	      this.$parent.wrapSelection('formatBlock', '<voter>');
	    },
	    activeState: function() {
	      return queryFormatBlockState('voter');
	    }
	  },
	  fit: {
	    display: "<button ng-click='action()' ng-class='displayActiveToolClass(active)'><i class='fa fa-magic'></i> 自動修正</button>",
	    action: function() {
	      var editor;
	      editor = angular.element('text-angular');
	      editor.find('.editor-content p').removeAttr('style');
	      return this.$parent.wrapSelection('formatBlock', '<p>');
	    },
	    activeState: function() {
	      return false;
	    }
	  }
	}, ($rootScope.textAngularTools != null)? $rootScope.textAngularTools : {});
		
	return {
		require: '?ngModel',
		scope: {},
		restrict: "EA",
		link: function(scope, element, attrs, ngModel) {
			var group, groupElement, keydown, keyup, mouseup, tool, toolElement; //all these vars should not be accessable outside this directive
			// get the settings from the defaults and add our specific functions that need to be on the scope
			angular.extend(scope, $rootScope.textAngularOpts, {
				// wraps the selection in the provided tag / execCommand function.
				wrapSelection: function(command, opt) {
					document.execCommand(command, false, opt);
					// refocus on the shown display element, this fixes a display bug when using :focus styles to outline the box. You still have focus on the text/html input it just doesn't show up
					if (scope.showHtml)
						scope.displayElements.html[0].focus();
					else
						scope.displayElements.text[0].focus();
					// note that wrapSelection is called via ng-click in the tool plugins so we are already within a $apply
					scope.updateSelectedStyles();
					if (!scope.showHtml) scope.updateTaBindtext(); // only update if in text or WYSIWYG mode
				},
				showHtml: false
			});
			// setup the options from the optional attributes
			if (!!attrs.taToolbar)					scope.toolbar = scope.$eval(attrs.taToolbar);
			if (!!attrs.taFocussedClass)			scope.classes.focussed = scope.$eval(attrs.taFocussedClass);
			if (!!attrs.taToolbarClass)				scope.classes.toolbar = attrs.taToolbarClass;
			if (!!attrs.taToolbarGroupClass)		scope.classes.toolbarGroup = attrs.taToolbarGroupClass;
			if (!!attrs.taToolbarButtonClass)		scope.classes.toolbarButton = attrs.taToolbarButtonClass;
			if (!!attrs.taToolbarActiveButtonClass)	scope.classes.toolbarButtonActive = attrs.taToolbarActiveButtonClass;
			if (!!attrs.taTextEditorClass)			scope.classes.textEditor = attrs.taTextEditorClass;
			if (!!attrs.taHtmlEditorClass)			scope.classes.htmlEditor = attrs.taHtmlEditorClass;
			
			var originalContents = element.html();
			element.html(''); // clear the original content
			
			// Setup the HTML elements as variable references for use later
			scope.displayElements = {
				photoSelector: angular.element("<photo-selector></photo-selector>"),
				toolbar: angular.element("<div></div>"),
				forminput: angular.element("<input type='hidden' style='display: none;'>"), // we still need the hidden input even with a textarea as the textarea may have invalid/old input in it, wheras the input will ALLWAYS have the correct value.
				html: angular.element("<textarea ng-show='showHtml' ta-bind='html' ng-model='html' ></textarea>"),
				text: angular.element("<div contentEditable='true' ng-hide='showHtml' ta-bind='text' ng-model='text' ></div>")
			};

			// add the main elements to the origional element
			element.append(scope.displayElements.toolbar);
			element.append(scope.displayElements.photoSelector);
			element.append(scope.displayElements.text);
			element.append(scope.displayElements.html);
			
			if(!!attrs.name){
				scope.displayElements.forminput.attr('name', attrs.name);
				element.append(scope.displayElements.forminput);
			}
			
			if(!!attrs.taDisabled){
				scope.displayElements.text.attr('ta-readonly', 'disabled');
				scope.displayElements.html.attr('ta-readonly', 'disabled');
				scope.disabled = scope.$parent.$eval(attrs.taDisabled);
				scope.$parent.$watch(attrs.taDisabled, function(newVal){
					scope.disabled = newVal;
					if(scope.disabled){
						element.addClass('disabled');
					}else{
						element.removeClass('disabled');
					}
				});
			}
			
			// compile the scope with the text and html elements only - if we do this with the main element it causes a compile loop
			$compile(scope.displayElements.photoSelector)(scope);
			$compile(scope.displayElements.text)(scope);
			$compile(scope.displayElements.html)(scope);
			
			// add the classes manually last
			element.addClass("ta-root");
			scope.displayElements.toolbar.addClass("ta-toolbar " + scope.classes.toolbar);
			scope.displayElements.text.addClass("ta-text ta-editor " + scope.classes.textEditor);
			scope.displayElements.html.addClass("ta-html ta-editor " + scope.classes.textEditor);
			
			// note that focusout > focusin is called everytime we click a button
			element.on('focusin', function(){ // cascades to displayElements.text and displayElements.html automatically.
				element.addClass(scope.classes.focussed);
				$timeout(function(){ element.triggerHandler('focus'); }, 0); // to prevent multiple apply error defer to next seems to work.
			});
			element.on('focusout', function(){
				$timeout(function(){
					// if we have NOT focussed again on the text etc then fire the blur events
					if(!($document[0].activeElement === scope.displayElements.html[0]) && !($document[0].activeElement === scope.displayElements.text[0])){
						element.removeClass(scope.classes.focussed);
						$timeout(function(){ element.triggerHandler('blur'); }, 0); // to prevent multiple apply error defer to next seems to work.
					}
				}, 0);
			});
			
			scope.tools = {}; // Keep a reference for updating the active states later
			// create the tools in the toolbar
			for (var _i = 0; _i < scope.toolbar.length; _i++) {
				// setup the toolbar group
				group = scope.toolbar[_i];
				groupElement = angular.element("<div></div>");
				groupElement.addClass(scope.classes.toolbarGroup);
				for (var _j = 0; _j < group.length; _j++) {
					// init and add the tools to the group
					tool = group[_j]; // a tool name (key name from textAngularTools struct)
					toolElement = angular.element($rootScope.textAngularTools[tool].display);
					toolElement.addClass(scope.classes.toolbarButton);
					toolElement.attr('unselectable', 'on'); // important to not take focus from the main text/html entry
					toolElement.attr('tabindex', '-1');
					toolElement.attr('ng-disabled', 'showHtml()');
					var childScope = angular.extend(scope.$new(true), $rootScope.textAngularTools[tool], { // add the tool specific functions
						name: tool,
						showHtml: function(){
							if(this.name !== 'html') return this.$parent.disabled || this.$parent.showHtml;
							return this.$parent.disabled;
						},
						displayActiveToolClass: function(active){
							return (active)? this.$parent.classes.toolbarButtonActive : '';
						}
					}); //creates a child scope of the main angularText scope and then extends the childScope with the functions of this particular tool
					scope.tools[tool] = childScope; // reference to the scope kept
					groupElement.append($compile(toolElement)(childScope)); // append the tool compiled with the childScope to the group element
				}
				scope.displayElements.toolbar.append(groupElement); // append the group to the toolbar
			}
			
			// changes to the model variable from outside the html/text inputs
			if(attrs.ngModel){ // if no ngModel, then the only input is from inside text-angular
				ngModel.$render = function() {
					scope.displayElements.forminput.val(ngModel.$viewValue);
					// if the editors aren't focused they need to be updated, otherwise they are doing the updating
					if (!($document[0].activeElement === scope.displayElements.html[0]) && !($document[0].activeElement === scope.displayElements.text[0])) {
						var val = ngModel.$viewValue || ''; // in case model is null
						scope.text = val;
						scope.html = val;
					}
				};
			}else{ // if no ngModel then update from the contents of the origional html.
				scope.displayElements.forminput.val(originalContents);
				scope.text = originalContents;
				scope.html = originalContents;
			}
			
			scope.$watch('text', function(newValue, oldValue){
				scope.html = newValue;
				if(attrs.ngModel && newValue !== oldValue) ngModel.$setViewValue(newValue);
				scope.displayElements.forminput.val(newValue);
			});
			scope.$watch('html', function(newValue, oldValue){
				scope.text = newValue;
				if(attrs.ngModel && newValue !== oldValue) ngModel.$setViewValue(newValue);
				scope.displayElements.forminput.val(newValue);
			});
			
			// the following is for applying the active states to the tools that support it
			scope.bUpdateSelectedStyles = false;
			// loop through all the tools polling their activeState function if it exists
			scope.updateSelectedStyles = function() {
				for (var _k = 0; _k < scope.toolbar.length; _k++) {
					var groups = scope.toolbar[_k];
					for (var _l = 0; _l < groups.length; _l++) {
						tool = groups[_l];
						if (scope.tools[tool].activeState != null) {
							scope.tools[tool].active = scope.tools[tool].activeState.apply(scope);
						}
					}
				}
				if (scope.bUpdateSelectedStyles) $timeout(scope.updateSelectedStyles, 200); // used to update the active state when a key is held down, ie the left arrow
			};
			// start updating on keydown
			keydown = function(e) {
				scope.bUpdateSelectedStyles = true;
				scope.$apply(function() {
					scope.updateSelectedStyles();
				});
			};
			scope.displayElements.html.on('keydown', keydown);
			scope.displayElements.text.on('keydown', keydown);
			// stop updating on key up and update the display/model
			keyup = function(e) {
				scope.bUpdateSelectedStyles = false;
				if (e.delegateTarget === scope.displayElements.text[0]) checkEmpty();
			};
			scope.displayElements.html.on('keyup', keyup);
			scope.displayElements.text.on('keyup', keyup);
			// update the toolbar active states when we click somewhere in the text/html boxed
			mouseup = function(e) {
				scope.$apply(function() {
					scope.updateSelectedStyles();
				});
			};
			scope.displayElements.html.on('mouseup', mouseup);
			scope.displayElements.text.on('mouseup', mouseup);
			// insert initial paragraph and check empty when backspace
			checkEmpty = function() {
				nodes = scope.displayElements.text[0].childNodes;
				if (!nodes.length) {
					initialParagraph = angular.element('<p>');
					scope.displayElements.text.append(initialParagraph);
					selection = window.getSelection();
					if (selection.focusNode === scope.displayElements.text[0]) {
						range = document.createRange();
						range.selectNodeContents(initialParagraph[0]);
						selection.removeAllRanges();
						selection.addRange(range);
					}
				}
			}
			scope.displayElements.text.on('focus', checkEmpty);
		}
	};
}]).directive('taBind', ['$sanitize', '$document', 'taFixChrome', function($sanitize, $document, taFixChrome){
	// Uses for this are textarea or input with ng-model and ta-bind='text' OR any non-form element with contenteditable="contenteditable" ta-bind="html|text" ng-model
	return {
		require: 'ngModel',
		scope: {'taBind': '@'},
		link: function(scope, element, attrs, ngModel){
			var isContentEditable = element[0].tagName.toLowerCase() !== 'textarea' && element[0].tagName.toLowerCase() !== 'input' && element.attr('contenteditable') !== undefined && element.attr('contenteditable');
			var isReadonly = false;
			// in here we are undoing the converts used elsewhere to prevent the < > and & being displayed when they shouldn't in the code.
			var compileHtml = function(){
				var result = taFixChrome(element).html();
				if(scope.taBind === 'html' && isContentEditable) result = result.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, '&');
				return result;
			};
			
			scope.$parent['updateTaBind' + scope.taBind] = function(){//used for updating when inserting wrapped elements
				var compHtml = compileHtml();
				var tempParsers = ngModel.$parsers;
				ngModel.$parsers = []; // temp disable of the parsers
				ngModel.$oldViewValue = compHtml;
				ngModel.$setViewValue(compHtml);
				ngModel.$parsers = tempParsers;
			};
			
			//this code is used to update the models when data is entered/deleted
			if(isContentEditable){
				element.on('keyup', function(e){
					if(!isReadonly) ngModel.$setViewValue(compileHtml());
				});
			}
			
			//prevents the errors occuring when we are typing in html code
			function trySanitize(unsafe, oldsafe) {
				// any exceptions (lets say, color for example) should be made here but with great care
				var safe;
				try {
					safe = $sanitize(unsafe);
				} catch (e) {
					safe = oldsafe || '';
				}
				return safe;
			}

			// all the code here takes the information from the above keyup function or any other time that the viewValue is updated and parses it for storage in the ngModel
			ngModel.$parsers.push(function(unsafe) {
				
				// this is what runs when ng-bind-html is used on the variable
				var safe = ngModel.$oldViewValue = trySanitize(unsafe, ngModel.$oldViewValue);
				return safe;
			});

			// because textAngular is bi-directional (which is awesome) we need to also sanitize values going in from the server
			ngModel.$formatters.push(function(unsafe) {
				var safe = trySanitize(unsafe, '');
				return safe;
			});
			
			// changes to the model variable from outside the html/text inputs
			ngModel.$render = function() {
				// if the editor isn't focused it needs to be updated, otherwise it's receiving user input
				if ($document[0].activeElement !== element[0]) {
					var val = ngModel.$viewValue || ''; // in case model is null
					ngModel.$oldViewValue = val;
					if(scope.taBind === 'text'){ //WYSIWYG Mode
						try{
							angular.element(val).find('script').remove(); // to prevent JS XSS insertion executing arbritrary code
						}catch(e){}; // catches when no HTML tags are present errors.
						element.html(val);
						element.find('a').on('click', function(e){
							e.preventDefault();
							return false;
						});
					}else if(isContentEditable || (element[0].tagName.toLowerCase() !== 'textarea' && element[0].tagName.toLowerCase() !== 'input')) // make sure the end user can SEE the html code.
						element.html(val.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, '&gt;'));
					else element.val(val); // only for input and textarea inputs
				}else if(!isContentEditable) element.val(val); // only for input and textarea inputs
			};
			
			if(!!attrs.taReadonly){
				//set initial value
				if(scope.$parent.$eval(attrs.taReadonly)){ // we changed to readOnly mode (taReadonly='true')
					if(element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input') element.attr('disabled', 'disabled');
					if(element.attr('contenteditable') !== undefined && element.attr('contenteditable')) element.removeAttr('contenteditable');
				}else{ // we changed to NOT readOnly mode (taReadonly='false')
					if(element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input') element.removeAttr('disabled');
					else if(isContentEditable) element.attr('contenteditable', 'true');
				}
				scope.$parent.$watch(attrs.taReadonly, function(newVal, oldVal){ // taReadonly only has an effect if the taBind element is an input or textarea or has contenteditable='true' on it. Otherwise it is readonly by default
					if(oldVal === newVal) return;
					if(newVal){ // we changed to readOnly mode (taReadonly='true')
						if(element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input') element.attr('disabled', 'disabled');
						if(element.attr('contenteditable') !== undefined && element.attr('contenteditable')) element.removeAttr('contenteditable');
					}else{ // we changed to NOT readOnly mode (taReadonly='false')
						if(element[0].tagName.toLowerCase() === 'textarea' || element[0].tagName.toLowerCase() === 'input') element.removeAttr('disabled');
						else if(isContentEditable) element.attr('contenteditable', 'true');
					}
					isReadonly = newVal;
				});
			}
		}
	};
}]).factory('taFixChrome', function(){
	// get whaterever rubbish is inserted in chrome
	var taFixChrome = function($html){ // should be an angular.element object, returns object for chaining convenience
		// fix the chrome trash that gets inserted sometimes
		var spans = angular.element($html).find('span'); // default wrapper is a span so find all of them
		for(var s = 0; s < spans.length; s++){
			var span = angular.element(spans[s]);
			if(span.attr('style') && span.attr('style').match(/line-height: 1.428571429;|color: inherit; line-height: 1.1;/i)){ // chrome specific string that gets inserted into the style attribute, other parts may vary. Second part is specific ONLY to hitting backspace in Headers
				if(span.next().length > 0 && span.next()[0].tagName === 'BR') span.next().remove()
				span.replaceWith(span.html());
			}
		}
		var result = $html.html().replace(/style="[^"]*?(line-height: 1.428571429;|color: inherit; line-height: 1.1;)[^"]*"/ig, ''); // regex to replace ONLY offending styles - these can be inserted into various other tags on delete
		if(result !== $html.html()) $html.html(result); // only replace when something has changed, else we get focus problems on inserting lists
		return $html;
	};
	return taFixChrome;
});