// fallow-ignore-file unused-file

(function () {
	'use strict';

	var settings = window.BricksDialCodePhone || {};
	var selector = settings.selector || '.brxe-form input[type="tel"], .bricks-form input[type="tel"]';

	function toArray(value) {
		return Array.isArray(value) ? value : [];
	}

	function camelToKebab(value) {
		return value.replace(/[A-Z]/g, function (letter) {
			return '-' + letter.toLowerCase();
		});
	}

	function countryList(value) {
		var aliases = {
			america: 'us',
			australia: 'au',
			canada: 'ca',
			emirates: 'ae',
			greatbritain: 'gb',
			pakistan: 'pk',
			uae: 'ae',
			uk: 'gb',
			unitedarabemirates: 'ae',
			unitedkingdom: 'gb',
			unitedstates: 'us',
			unitedstatesofamerica: 'us',
			usa: 'us'
		};

		if (Array.isArray(value)) {
			return value
				.map(function (country) {
					return countryList(String(country))[0] || '';
				})
				.filter(function (country, index, countries) {
					return country.length === 2 && countries.indexOf(country) === index;
				});
		}

		if (typeof value !== 'string') {
			return [];
		}

		return value.split(',')
			.map(function (country) {
				var normalized = country.trim().toLowerCase().replace(/[^a-z]/g, '');

				return aliases[normalized] || normalized;
			})
			.filter(function (country, index, countries) {
				return country.length === 2 && countries.indexOf(country) === index;
			});
	}

	function getPreferredCountries(input) {
		var countryOrder = countryList(getFormSetting(input, 'favorites'));

		if (!countryOrder.length) {
			countryOrder = toArray(settings.countryOrder);
		}

		return countryOrder;
	}

	function closestForm(input) {
		return input.closest('form');
	}

	function getFormSetting(input, name) {
		var form = closestForm(input);

		return form ? form.getAttribute('data-bricks-dialcode-' + name) : '';
	}

	function shouldShowFlags(input) {
		var setting = getFormSetting(input, 'show-flags');

		return setting !== '0' && setting !== 'false' && setting !== 'no' && setting !== 'off';
	}

	function getInputSetting(input, key) {
		return input.getAttribute('data-' + camelToKebab(key)) || input.getAttribute('data-' + key) || '';
	}

	function getCountry(input, key, fallback) {
		var dataValue = getInputSetting(input, key);
		var formValue = getFormSetting(input, 'initial-country');

		if (dataValue) {
			return dataValue;
		}

		if (formValue) {
			return formValue;
		}

		return settings[key] || fallback;
	}

	function isEligible(input) {
		return input && !input.disabled && input.type === 'tel' && !input.dataset.bricksDialcodeReady;
	}

	function syncInputValue(input) {
		var instance = input.bricksDialCodeInstance;
		var internationalValue;

		if (!instance || typeof instance.getNumber !== 'function') {
			return;
		}

		internationalValue = instance.getNumber();

		if (internationalValue) {
			input.value = internationalValue;
			return;
		}

		syncInputValueWithDialCode(input, instance);
	}

	function getSelectedCountryData(instance) {
		return instance.getSelectedCountryData ? instance.getSelectedCountryData() : null;
	}

	function canPrefixDialCode(countryData, nationalValue) {
		if (!countryData || !countryData.dialCode) {
			return false;
		}

		return nationalValue && nationalValue.charAt(0) !== '+';
	}

	function syncInputValueWithDialCode(input, instance) {
		var countryData = getSelectedCountryData(instance);
		var nationalValue = input.value.replace(/[^\d+]/g, '');

		if (canPrefixDialCode(countryData, nationalValue)) {
			input.value = '+' + countryData.dialCode + nationalValue.replace(/[^\d]/g, '');
		}
	}

	function attachFormSync(input) {
		var form = closestForm(input);

		if (!form || form.dataset.bricksDialcodeSubmitReady) {
			return;
		}

		form.dataset.bricksDialcodeSubmitReady = '1';

		form.addEventListener('submit', function () {
			form.querySelectorAll(selector).forEach(syncInputValue);
		}, true);
	}

	function findDropdown(input) {
		var container = input.closest('.iti');

		return container ? container.querySelector('.iti__dropdown-content, .iti__country-list') : null;
	}

	function enableWheelScroll(input) {
		var dropdown = findDropdown(input);

		if (!dropdown || dropdown.dataset.bricksDialcodeWheelReady) {
			return;
		}

		dropdown.dataset.bricksDialcodeWheelReady = '1';

		dropdown.addEventListener('wheel', function (event) {
			handleDropdownWheel(event, dropdown);
		}, { passive: false });
	}

	function getScrollableDropdownTarget(dropdown) {
		if (dropdown.matches('.iti__country-list')) {
			return dropdown;
		}

		return dropdown.querySelector('.iti__country-list') || dropdown;
	}

	function handleDropdownWheel(event, dropdown) {
		var scrollTarget = getScrollableDropdownTarget(dropdown);

		if (!scrollTarget || scrollTarget.scrollHeight <= scrollTarget.clientHeight) {
			return;
		}

		scrollTarget.scrollTop += event.deltaY;
		event.preventDefault();
		event.stopPropagation();
	}

	function forceFavoriteOrder(input, countries) {
		var dropdown = findDropdown(input);
		var list;

		if (!dropdown || !countries.length) {
			return;
		}

		list = dropdown.querySelector('.iti__country-list') || dropdown;

		countries.slice().reverse().forEach(function (country) {
			var item = list.querySelector('[data-country-code="' + country + '"]');

			if (item) {
				list.insertBefore(item, list.firstElementChild);
				item.classList.add('bricks-dialcode-favorite');
			}
		});
	}

	function prepareDropdown(input, countries) {
		window.setTimeout(function () {
			enableWheelScroll(input);
			forceFavoriteOrder(input, countries);
		}, 0);
	}

	function getInitialCountryLookup() {
		var fallbackCountry = settings.fallbackCountry || 'us';

		return function () {
			return fetch('https://ipapi.co/json/')
				.then(function (response) {
					return response.json();
				})
				.then(function (data) {
					return data && data.country_code ? data.country_code.toLowerCase() : fallbackCountry;
				})
				.catch(function () {
					return fallbackCountry;
				});
		};
	}

	function applyCountryFilters(options) {
		var onlyCountries = countryList(settings.onlyCountries);
		var excludeCountries = countryList(settings.excludeCountries);

		if (onlyCountries.length) {
			options.onlyCountries = onlyCountries;
		}

		if (excludeCountries.length) {
			options.excludeCountries = excludeCountries;
		}
	}

	function applyInitialCountry(options, initialCountry) {
		if (initialCountry && initialCountry !== 'auto') {
			options.initialCountry = initialCountry;
		} else if (settings.initialCountryLookup === '1') {
			options.initialCountryLookup = getInitialCountryLookup();
		}
	}

	function buildInputOptions(input, countryOrder) {
		var initialCountry = getCountry(input, 'initialCountry', '');
		var showFlags = shouldShowFlags(input);
		var options = {
			containerClass: showFlags ? 'bricks-dialcode' : 'bricks-dialcode bricks-dialcode-no-flags',
			separateDialCode: true,
			showFlags: showFlags,
			numberDisplayFormat: 'NATIONAL',
			loadUtils: function () {
				return import(settings.utilsScript);
			}
		};

		if (countryOrder.length) {
			options.countryOrder = countryOrder;
		}

		applyCountryFilters(options);
		applyInitialCountry(options, initialCountry);

		return options;
	}

	function initInput(input) {
		if (!isEligible(input) || typeof window.intlTelInput !== 'function') {
			return;
		}

		var countryOrder = getPreferredCountries(input);
		var options = buildInputOptions(input, countryOrder);

		input.dataset.bricksDialcodeReady = '1';
		input.bricksDialCodeInstance = window.intlTelInput(input, options);
		input.addEventListener('open:countrydropdown', function () {
			prepareDropdown(input, countryOrder);
		});

		attachFormSync(input);
		prepareDropdown(input, countryOrder);
	}

	function initAll(root) {
		var scope = root && root.querySelectorAll ? root : document;

		scope.querySelectorAll(selector).forEach(initInput);
	}

	function observeDynamicForms() {
		if (!window.MutationObserver) {
			return;
		}

		var observer = new MutationObserver(function (mutations) {
			mutations.forEach(function (mutation) {
				mutation.addedNodes.forEach(function (node) {
					if (node.nodeType === 1) {
						initAll(node);
					}
				});
			});
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', function () {
			initAll(document);
			observeDynamicForms();
		});
	} else {
		initAll(document);
		observeDynamicForms();
	}

	document.addEventListener('bricks/ajax/load_page/completed', function () {
		initAll(document);
	});
})();
