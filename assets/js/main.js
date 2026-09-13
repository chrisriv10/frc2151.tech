/*
	Hyperspace by HTML5 UP
	html5up.net | @ajlkn
	Free for personal and commercial use under the CCA 3.0 license (html5up.net/license)
*/

(function($) {

	var	$window = $(window),
		$body = $('body'),
		$sidebar = $('#sidebar'),
		$header = $('#header');

	// Breakpoints.
		breakpoints({
			xlarge:   [ '1281px',  '1680px' ],
			large:    [ '981px',   '1280px' ],
			medium:   [ '737px',   '980px'  ],
			small:    [ '481px',   '736px'  ],
			xsmall:   [ null,      '480px'  ]
		});

	// Mobile nav toggle for the subpage header and homepage top bar.
	function setupMobileNav($container) {
		if ($container.length === 0)
			return;

		var $nav = $container.find('nav').first(),
			$navToggle = $container.find('.mobile-nav-toggle').first();

		if ($nav.length === 0)
			return;

		if (!$nav.attr('id'))
			$nav.attr('id', 'mobile-nav');

		// Keep legacy/template pages usable if they do not include the toggle markup.
		if ($navToggle.length === 0) {
			$navToggle = $('<button class="mobile-nav-toggle" type="button" aria-label="Open navigation" aria-expanded="false" aria-controls="' + $nav.attr('id') + '"><span aria-hidden="true"></span></button>');
			$navToggle.insertBefore($nav);
		}

		function closeMobileNav(returnFocus) {
			$nav.removeClass('open');
			$navToggle.attr({
				'aria-expanded': 'false',
				'aria-label': 'Open navigation'
			});

			if (returnFocus)
				$navToggle.trigger('focus');
		}

		$navToggle.on('click', function() {
			var isOpen = $nav.hasClass('open');
			$nav.toggleClass('open');
			$navToggle.attr({
				'aria-expanded': isOpen ? 'false' : 'true',
				'aria-label': isOpen ? 'Open navigation' : 'Close navigation'
			});
		});

		$nav.find('a').on('click', function() {
			closeMobileNav(false);
		});

		$window.on('keydown', function(event) {
			if (event.key === 'Escape' && $nav.hasClass('open'))
				closeMobileNav(true);
		});

		$window.on('resize', function() {
			if (!breakpoints.active('<=small'))
				closeMobileNav(false);
		});
	}

	setupMobileNav($header);
	setupMobileNav($sidebar);

	// Hack: Enable IE flexbox workarounds.
		if (browser.name == 'ie')
			$body.addClass('is-ie');

	// Play initial animations on page load.
		$window.on('load', function() {
			window.setTimeout(function() {
				$body.removeClass('is-preload');
			}, 100);
		});

	// Forms.

		// Hack: Activate non-input submits.
			$('form').on('click', '.submit', function(event) {

				// Stop propagation, default.
					event.stopPropagation();
					event.preventDefault();

				// Submit form.
					$(this).parents('form').submit();

			});

	// Sidebar.
		if ($sidebar.length > 0) {

			var $sidebar_a = $sidebar.find('a');

			$sidebar_a.filter('[href^="#"]')
				.addClass('scrolly')
				.on('click', function() {

					var $this = $(this);

					// External link? Bail.
						if ($this.attr('href').charAt(0) != '#')
							return;

					// Deactivate all links.
						$sidebar_a.removeClass('active');

					// Activate link *and* lock it (so Scrollex doesn't try to activate other links as we're scrolling to this one's section).
						$this
							.addClass('active')
							.addClass('active-locked');

				})
				.each(function() {

					var	$this = $(this),
						id = $this.attr('href'),
						$section;

					// External link? Bail.
						if (id.charAt(0) != '#')
							return;

						$section = $(id);

					// No section for this link? Bail.
						if ($section.length < 1)
							return;

					// Scrollex.
						$section.scrollex({
							mode: 'middle',
							top: '-20vh',
							bottom: '-20vh',
							initialize: function() {

								// Deactivate section.
									$section.addClass('inactive');

							},
							enter: function() {

								// Activate section.
									$section.removeClass('inactive');

								// No locked links? Deactivate all links and activate this section's one.
									if ($sidebar_a.filter('.active-locked').length == 0) {

										$sidebar_a.removeClass('active');
										$this.addClass('active');

									}

								// Otherwise, if this section's link is the one that's locked, unlock it.
									else if ($this.hasClass('active-locked'))
										$this.removeClass('active-locked');

							}
						});

				});

		}

	// Scrolly.
		$('.scrolly').scrolly({
			speed: 100,
			offset: function() {

				// If <=large, >small, and sidebar is present, use its height as the offset.
					if (breakpoints.active('<=large')
					&&	!breakpoints.active('<=small')
					&&	$sidebar.length > 0)
						return $sidebar.height();

				return 0;

			}
		});

	// Fade between local pages.
		$('a[href$=".html"]').on('click', function(event) {

			var $this = $(this),
				href = $this.attr('href');

			if (!href
			||	$this.attr('target') == '_blank'
			||	href.charAt(0) == '#'
			||	href.indexOf('://') >= 0
			||	href == window.location.pathname.split('/').pop())
				return;

			event.preventDefault();
			$body.addClass('is-page-transitioning');

			window.setTimeout(function() {
				window.location.href = href;
			}, 350);

		});

	// Replay section animations when sidebar links jump to them.
	$('a[href="#one"], a[href="#news"], a[href="#three"]').on('click', function() {

			var $target;

			if ($(this).attr('href') == '#one')
				$target = $('#one.spotlights > section');
			else if ($(this).attr('href') == '#news')
				$target = $('#news.wrapper.fade-up');
			else
				$target = $('#three.wrapper.fade-up');

			if ($target.length < 1)
				return;

			$target.addClass('inactive');

			window.setTimeout(function() {
				$target.removeClass('inactive');
			}, 900);

		});

	// Spotlights.
		$('.spotlights > section')
			.scrollex({
				mode: 'middle',
				top: '-10vh',
				bottom: '-10vh',
				initialize: function() {

					// Deactivate section.
						$(this).addClass('inactive');

				},
				enter: function() {

					// Activate section.
						$(this).removeClass('inactive');

				}
			})
			.each(function() {

				var	$this = $(this),
					$image = $this.find('.image'),
					$img = $image.find('img'),
					x;

				// Assign image.
					$image.css('background-image', 'url(' + $img.attr('src') + ')');

				// Set background position.
					if (x = $img.data('position'))
						$image.css('background-position', x);

				// Hide <img>.
					$img.hide();

			});

	// Features.
		$('.features')
			.scrollex({
				mode: 'middle',
				top: '-20vh',
				bottom: '-20vh',
				initialize: function() {

					// Deactivate section.
						$(this).addClass('inactive');

				},
				enter: function() {

					// Activate section.
						$(this).removeClass('inactive');

				}
			});

})(jQuery);
