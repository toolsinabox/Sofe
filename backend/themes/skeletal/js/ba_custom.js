function initSelectBox() {
    $('.js-selectbox').each(function() {
        const selectedOption = $(this).children("option:selected").text();
        var $this = $(this),
            numberOfOptions = $(this).children('option:not([value=""])');
        $this.wrap('<div class="select"></div>');
        $this.after('<div class="select-display form-control"></div>');
        var $selectDisplay = $this.next('.select-display');
        $selectDisplay.text(selectedOption);
        var $list = $('<ul />', {
            'class': 'options'
        }).insertAfter($selectDisplay);
        for (var i = 0; i < numberOfOptions.length; i++) {
            $('<li />', {
                text: $(numberOfOptions[i]).text(),
                rel: $(numberOfOptions[i]).val(),
                class: $(numberOfOptions[i]).text() === selectedOption ? 'active' : 'false'
            }).appendTo($list);
        }
        $this.closest('.form-select').addClass('active');
        var $listItems = $list.children('li');
        $selectDisplay.on('click', function(e) {
            e.preventDefault();
            $('.select-display.active').not(e.target).each(function() {
                $(this).removeClass('active');
                $(this).next('ul.options').hide();
            });
            $(this).toggleClass('active').next('ul.options').toggle();
        });
        $listItems.on('click', function(e) {
            e.preventDefault();
            $listItems.removeClass('active');
            $(e.target).addClass('active');
            $selectDisplay.text($(this).text()).removeClass('active');
            $this.val($(this).attr('rel')).trigger('change');
            $list.hide();
        });
    });
    $(document).on('click', function(e) {
        if ($(e.target).closest('.form-select').length === 0) {
            $('.form-select').each(function() {
                $(this).find('.select-display').removeClass('active');
                $(this).find('.options').hide();
            });
        }
    });
}
$(document).ready(function() {
    $('.slick-slider').slick({
        dots: true,
        slidesToShow: 1,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 4000,
        arrows: true,
        nextArrow: '<button class="slick-next slick-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="37" height="70" viewBox="0 0 37 70"> <g id="_" data-name="&gt;" transform="translate(37 70) rotate(180)"> <rect id="Rectangle_211" data-name="Rectangle 211" width="37" height="70" fill="rgba(255,255,255,0)"/> <path id="Path_1074" data-name="Path 1074" d="M221.24,1861l-32,32,32,32" transform="translate(-186.24 -1858)" fill="none" stroke="#999" stroke-width="2"/> </g> </svg> </button>',
        prevArrow: '<button class="slick-prev slick-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="34.121" height="65.414" viewBox="0 0 34.121 65.414"> <path id="Path_1074" data-name="Path 1074" d="M221.24,1861l-32,32,32,32" transform="translate(-187.826 -1860.293)" fill="none" stroke="#999" stroke-width="2"/> </svg></button>',
        responsive: [{
            breakpoint: 1024,
            settings: {
                arrows: true,
                dots: true
            }
        }, {
            breakpoint: 992,
            settings: {
                arrows: true,
                dots: true
            }
        }, {
            breakpoint: 768,
            settings: {
                arrows: true,
                dots: true
            }
        }, ]
    });
    $('.list-testimonials').slick({
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: false,
        arrows: true,
        adaptiveHeight: true,
        nextArrow: '<button class="slick-next slick-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="37" height="70" viewBox="0 0 37 70"> <g id="_" data-name="&gt;" transform="translate(37 70) rotate(180)"> <rect id="Rectangle_211" data-name="Rectangle 211" width="37" height="70" fill="rgba(255,255,255,0)"/> <path id="Path_1074" data-name="Path 1074" d="M221.24,1861l-32,32,32,32" transform="translate(-186.24 -1858)" fill="none" stroke="#999" stroke-width="2"/> </g> </svg> </button>',
        prevArrow: '<button class="slick-prev slick-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="34.121" height="65.414" viewBox="0 0 34.121 65.414"> <path id="Path_1074" data-name="Path 1074" d="M221.24,1861l-32,32,32,32" transform="translate(-187.826 -1860.293)" fill="none" stroke="#999" stroke-width="2"/> </svg></button>',
        responsive: [{
            breakpoint: 1200,
            settings: {
                slidesToShow: 3,
            }
        }, {
            breakpoint: 992,
            settings: {
                slidesToShow: 3,
            }
        }, {
            breakpoint: 768,
            settings: {
                slidesToShow: 2,
            }
        }, {
            breakpoint: 481,
            settings: {
                slidesToShow: 1,
            }
        }]
    });
    $('.brand-img-wrapper').slick({
        slidesToShow: 3,
        slidesToScroll: 1,
        autoplay: true,
        autoplaySpeed: 2000,
        infinite: true,
        arrows: false
    });
    $('.slick-product').slick({
        slidesToShow: 5,
        slidesToScroll: 1,
        autoplay: false,
        arrows: true,
        nextArrow: '<button class="slick-next slick-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="37" height="70" viewBox="0 0 37 70"> <g id="_" data-name="&gt;" transform="translate(37 70) rotate(180)"> <rect id="Rectangle_211" data-name="Rectangle 211" width="37" height="70" fill="rgba(255,255,255,0)"/> <path id="Path_1074" data-name="Path 1074" d="M221.24,1861l-32,32,32,32" transform="translate(-186.24 -1858)" fill="none" stroke="#000" stroke-width="6"/> </g> </svg> </button>',
        prevArrow: '<button class="slick-prev slick-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="34.121" height="65.414" viewBox="0 0 34.121 65.414"> <path id="Path_1074" data-name="Path 1074" d="M221.24,1861l-32,32,32,32" transform="translate(-187.826 -1860.293)" fill="none" stroke="#000" stroke-width="6"/> </svg></button>',
        responsive: [{
            breakpoint: 1200,
            settings: {
                slidesToShow: 3,
            }
        }, {
            breakpoint: 992,
            settings: {
                slidesToShow: 3,
            }
        }, {
            breakpoint: 768,
            settings: {
                slidesToShow: 2,
                dots: true
            }
        }]
    });
    $('.brand-item [data-toggle="tooltip"]').tooltip({
        placement: 'bottom',
    });
    $('.js-btn-back-to-top').on('click', function() {
        $('html, body').animate({
            scrollTop: 0
        }, 900);
        return false;
    });
    $('.header-search-finder .form-search').on('click', function() {
        $(this).toggleClass('active');
        $('.overlap-bg').toggleClass('show');
        $('.form-finder-panel').slideToggle();
    });
    const numberResultText = $('.js-number-result-origin').text();
    $('#left-sidebar .number-result').text(numberResultText);
    const numberResult = $('.js-row-result .row-product > article').length;
    if (numberResult === 0) {
        $('.sidebar-filter').hide();
    }
    $('.slider-nav .slider').on('init', function(event, slick) {
        $('.slider-nav .slick-slide.slick-current').addClass('is-active');
    }).slick({
        slidesToShow: 5,
        slidesToScroll: 5,
        infinite: false,
        focusOnSelect: false,
    });
    $('.slider-nav .slider').on('click', '.slick-slide', function(event) {
        event.preventDefault();
        $('.slider-nav .slick-slide.is-active').removeClass('is-active');
        $(this).addClass('is-active');
    });
    $(".js-product-img").on("click", function() {
        const urlFullImg = $(this).data("fullimg");
        $(".js-product-displayed-img").find("img").attr("src", urlFullImg);
        $(".js-product-displayed-img.js-fancybox").attr("href", urlFullImg);
    });

    function addLi(text) {
        var stringULli = "<ul>";
        var pattern = /^[0-9]$/;
        $(".js-list-brands li").each(function() {
            var text2 = $(this).find('img').attr('alt').slice(0, 1);
            if (!pattern.test(text2)) {
                if (text.toLowerCase() == text2.toLowerCase()) {
                    stringULli = stringULli + '<li>' + $(this).html() + '</li>';
                }
            }
        });
        stringULli = stringULli + "</ul>";
        $("#" + text).after(stringULli);
    }

    function addLiNone() {
        var stringNone = "<ul>";
        var pattern = /^[0-9]$/;
        $(".js-list-brands li").each(function() {
            var text2 = $(this).find('img').attr('alt').slice(0, 1);
            if (pattern.test(text2)) {
                stringNone = stringNone + '<li>' + $(this).html() + '</li>';
            }
        });
        stringNone = stringNone + "</ul>";
        $("#none").after(stringNone);
    }
    $('.js-sab-alphabet-secondary .sab-alphabet-secondary__letter > a').click(function() {
        if (!$(this).hasClass("active")) {
            $(".js-sab-alphabet-secondary .sab-alphabet-secondary__letter > a").removeClass("active");
            $(this).addClass("active");
        }
    });
    $(".List").each(function() {
        var text = $(this).text().slice(0, 1);
        addLi(text);
    });
    $(".List-none").each(function() {
        addLiNone();
    });
    $('.brands-page .brands-container div > ul').each(function() {
        if ($(this).html().length == 0) {
            $(this).parent().remove();
        }
    });
    $('.brands-container > div').each(function() {
        var search_content = $(this).children('h3').children('span').html();
        $('.js-sab-alphabet-secondary .sab-alphabet-secondary__letter').each(function() {
            var search_title = $(this).children('a').html();
            if (search_title == search_content) {
                $(this).show();
            }
        });
    });
    $('.brands-container').show();
    $('[data-toggle="tooltip"]').tooltip();
    $('.js-toggle-menu-header').on('click', function() {
        $('.menu-header-tablet').toggleClass('show');
        $('body').toggleClass('overflow-hidden');
        $('.overlap-bg-menu').toggleClass('show');
        $('.menu-header-tablet .sub-menu').removeClass('d-block');
    });
    $('.overlap-bg').on('click', function() {
        $('.menu-header-tablet').removeClass('show');
        $('.overlap-bg').removeClass('show');
        $('body').removeClass('overflow-hidden');
        $('.form-search').removeClass('active');
        $('.form-finder-panel').hide();
        $('.mega-menu').removeClass('show');
    });
    $('.js-toggle-header-search').on('click', function() {
        $('.header-search-tablet').toggleClass('d-flex align-items-center justify-content-between');
        $(this).toggleClass('show');
    });
    $('.js-toggle-header-search-mb').on('click', function() {
        $('.header-search-tablet').removeClass('d-flex align-items-center justify-content-between');
        $('.js-toggle-header-search').removeClass('show');
    });
    $('.js-toggle-submenu').on('click', function(e) {
        e.preventDefault();
        $(this).closest('.nav-link').next('.sub-menu').toggleClass('d-block');
    });
    $('.nav-link.title.js-toggle-submenu').on('click', function(e) {
        e.preventDefault();
        $(this).closest('.sub-menu').toggleClass('d-block');
    });
    $('.js-dropdown-toggle-static').on('click', function() {
        $(this).closest('.dropdown').toggleClass('show');
    });
    var addthis_config = {
        ui_offset_top: -12,
        services_compact: 'facebook,twitter,google_plusone_share,tumblr,linkedin'
    }
    var getWindowOptions = function() {
        var width = 500;
        var height = 350;
        var left = (window.innerWidth / 2) - (width / 2);
        var top = (window.innerHeight / 2) - (height / 2);
        return ['resizable,scrollbars,status', 'height=' + height, 'width=' + width, 'left=' + left, 'top=' + top, ].join();
    }
    const facebookShareBtn = $('.facebook-share-button');
    facebookShareBtn.on('click', function(e) {
        e.preventDefault();
        var facebookWindow = window.open('https://www.facebook.com/sharer/sharer.php?u=' + document.URL, 'ShareOnFacebook', getWindowOptions());
        if (facebookWindow.focus) {
            facebookWindow.focus();
        }
        return false;
    });
    var twitterBtn = $('.twitter-share-button');
    var shareUrl = 'https://twitter.com/intent/tweet?url=' + location.href;
    twitterBtn.href = shareUrl;
    twitterBtn.on('click', function(e) {
        e.preventDefault();
        var win = window.open(shareUrl, 'ShareOnTwitter', getWindowOptions());
        win.opener = null;
    });

    function setMegaMenuHeight() {
        const height = $('.header .mega-menu').innerHeight();
        document.documentElement.style.setProperty('--mega-menu-height', `${height}px`);
    }

    function checkHeaderSticky() {
        if ($(window).scrollTop() > 0) {
            $('.header').addClass('is-sticky');
        } else {
            $('.header').removeClass('is-sticky');
            $('.header').removeClass('is-show-mega-menu');
            $('.js-btn-toggle-menu-sticky').removeClass('active');
        }
    }

    function removeHeaderSticky() {
        $('.header').removeClass('is-sticky');
        $('.header').removeClass('is-show-mega-menu');
        $('.js-btn-toggle-menu-sticky').removeClass('active');
        $('body').addClass('no-fixed');
    }

    function checkAddToCardButtonSticky() {
        if ($(window).innerWidth() > 576) return;
        if ($('.js-card-shipping-calculate').length) {
            let distanceFromShippingCaculateToTop = $('.js-card-shipping-calculate').offset().top;
            if ($(window).scrollTop() > distanceFromShippingCaculateToTop) {
                $('body').addClass('fixed-btn-addtocart');
            } else {
                $('body').removeClass('fixed-btn-addtocart');
            }
        }
    }
    setMegaMenuHeight();
    checkHeaderSticky();
    checkAddToCardButtonSticky();
    $(window).on('scroll', function() {
        if ($(window).innerWidth() > 767) {
            checkHeaderSticky();
            checkAddToCardButtonSticky();
        }
    });
    $(window).on('resize', function() {
        setMegaMenuHeight();
        checkHeaderSticky();
        $('.slick-slider').slick('resize');
        distanceFromShippingCaculateToTop = $('.js-card-shipping-calculate').offset().top;
    });
    $('.js-btn-toggle-menu-sticky').on('click', function() {
        if ($(this).hasClass('active')) {
            $(this).removeClass('active');
            $('.header').removeClass('is-show-mega-menu');
        } else {
            $(this).addClass('active');
            $('.header').addClass('is-show-mega-menu');
        }
    });
    $(document).on('click', 'a[href^="#"]', function(e) {
        var id = $(this).attr('href');
        var $id = $(id);
        if ($id.length === 0) {
            return;
        }
        e.preventDefault();
        $('.nav-item a').removeClass('active');
        $(this).addClass('active')
        var pos = $id.offset().top - 120;
        $('body, html').animate({
            scrollTop: pos
        });
    });
    slickInit();
});

function slickInit() {
    var width = $(document).width();
    if ($('.js-usp').length) {
        if (width > 768) {
            $('.js-usp').filter('.slick-initialized').slick('unslick');
        } else {
            $('.js-usp').not('.slick-initialized').slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                autoplay: true,
                autoplaySpeed: 3000,
                arrows: true,
                nextArrow: '<button class="slick-next slick-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="37" height="70" viewBox="0 0 37 70"> <g id="_" data-name="&gt;" transform="translate(37 70) rotate(180)"> <rect id="Rectangle_211" data-name="Rectangle 211" width="37" height="70" fill="rgba(255,255,255,0)"/> <path id="Path_1074" data-name="Path 1074" d="M221.24,1861l-32,32,32,32" transform="translate(-186.24 -1858)" fill="none" stroke="#999" stroke-width="2"/> </g> </svg> </button>',
                prevArrow: '<button class="slick-prev slick-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="34.121" height="65.414" viewBox="0 0 34.121 65.414"> <path id="Path_1074" data-name="Path 1074" d="M221.24,1861l-32,32,32,32" transform="translate(-187.826 -1860.293)" fill="none" stroke="#999" stroke-width="2"/> </svg></button>',
                responsive: [{
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 1,
                    }
                }, {
                    breakpoint: 768,
                    settings: {
                        slidesToShow: 1,
                    }
                }]
            });
        }
    }
    if ($('.js-list-category').length) {
        if (width > 768) {
            $('.js-list-category').filter('.slick-initialized').slick('unslick');
        } else {
            $('.js-list-category').not('.slick-initialized').slick({
                rows: 2,
                slidesPerRow: 2,
                dots: true,
                arrows: false
            });
        }
    }
}
$(window).on("resize", function() {
    slickInit();
    if ($('.product-tab-detail').length) {
        var fixmeTop = $('.product-tab-detail')?.offset()?.top;
        $(window).scroll(function() {
            var currentScroll = $(window).scrollTop();
        });
    }
});

function phoneMobile() {
    if ($(window).innerWidth() > 767) return;
    if ($('header.header .utility-menu > ul > li').length) {
        $('header.header .utility-menu > ul > li').click(function() {
            $(this).children('.dropdown-menu').slideToggle();
        });
    }
}
phoneMobile();

setTimeout(() => {
    document.querySelector(".upsells-outer-wrapper").querySelectorAll("*[itemprop]").forEach(item => {
      item.removeAttribute('itemprop');
        item.removeAttribute('itemtype');
        item.removeAttribute('itemscope');
    })
    
    document.querySelectorAll(".product-item").forEach(item => {
        console.log('product-item')
        item.removeAttribute("itemscope");
        item.removeAttribute("itemtype");
    })
}, 100)

