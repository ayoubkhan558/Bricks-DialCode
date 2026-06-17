(function () {
	'use strict';

	var settings = window.BricksDialCodePhone || {};
	var selector = settings.selector || '.brxe-form input[type="tel"], .bricks-form input[type="tel"]';

	function toArray(value) {
		return Array.isArray(value) ? value : [];
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
			return value;
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
		return getFormSetting(input, 'show-flags') !== '0';
	}

	function getCountry(input, key, fallback) {
		return input.getAttribute('data-' + key) || getFormSetting(input, 'initial-country') || settings[key] || fallback;
	}

	function isEligible(input) {
		return input && !input.disabled && input.type === 'tel' && !input.dataset.bricksDialcodeReady;
	}

	function syncInputValue(input) {
		var instance = input.bricksDialCodeInstance;
		var internationalValue;
		var countryData;
		var nationalValue;

		if (!instance || typeof instance.getNumber !== 'function') {
			return;
		}

		internationalValue = instance.getNumber();

		if (internationalValue) {
			input.value = internationalValue;
			return;
		}

		countryData = instance.getSelectedCountryData ? instance.getSelectedCountryData() : null;
		nationalValue = input.value.replace(/[^\d+]/g, '');

		if (countryData && countryData.dialCode && nationalValue && nationalValue.charAt(0) !== '+') {
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
			var scrollTarget = dropdown.matches('.iti__country-list') ? dropdown : dropdown.querySelector('.iti__country-list') || dropdown;

			if (!scrollTarget || scrollTarget.scrollHeight <= scrollTarget.clientHeight) {
				return;
			}

			scrollTarget.scrollTop += event.deltaY;
			event.preventDefault();
			event.stopPropagation();
		}, { passive: false });
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

	function initInput(input) {
		if (!isEligible(input) || typeof window.intlTelInput !== 'function') {
			return;
		}

		var initialCountry = getCountry(input, 'initialCountry', '');
		var countryOrder = getPreferredCountries(input);

		var options = {
			containerClass: shouldShowFlags(input) ? 'bricks-dialcode' : 'bricks-dialcode bricks-dialcode-no-flags',
			separateDialCode: true,
			showFlags: shouldShowFlags(input),
			numberDisplayFormat: 'NATIONAL',
			countryOrder: countryOrder,
			onlyCountries: toArray(settings.onlyCountries),
			excludeCountries: toArray(settings.excludeCountries),
			loadUtils: function () {
				return import(settings.utilsScript);
			}
		};

		if (initialCountry && initialCountry !== 'auto') {
			options.initialCountry = initialCountry;
		} else if (settings.initialCountryLookup === '1') {
			options.initialCountryLookup = function () {
				var fallbackCountry = settings.fallbackCountry || 'us';

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
