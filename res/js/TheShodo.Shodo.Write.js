﻿/// <reference path="TheShodo.js" />
/// <reference path="TheShodo.Shodo.Core.js" />
/// <reference path="TheShodo.Shodo.Resources.js" />
/// <reference path="kazari.js" />

TheShodo.Shodo.Write = {
    // -- Settings
    videoFadeOutDuration  : 600,
    videoFadeOutTiming    : 15.5,
    alwaysSkipIntro       : false,
    preloadImages         : [
        '/res/img/icon_checkbox_01.png',
        //'/res/img/icon_checkbox_01_o.png',
        //'/res/img/icon_checkbox_02.png',
        '/res/img/icon_checkbox_02_o.png',
    ].map(function (e) { return TheShodo.sharedBaseUrl + e; }),

    currentPaper: 'hanshi',
    pageMode    : '',
    pageScale   : 1,
    
    // -- Variables
    CurrentPlayer: null
};

//
// -- EntryPoint --------------------------------------------------------------
//
$(document).ready(function () {
    TheShodo.Shodo.Write.launch();
});

//
// -- Setup -------------------------------------------------------------------
//
// Setup flow: prepareStage -> launch -> loading(waiting for all resources) -> intro -> initialize -> stand by ready! 
//
TheShodo.Shodo.Write.launch = function () {
    this.commandHooker = new Kazari.CommandHooker();
    this.commandHooker.setup(window);
    this.commandHooker.addMapping(['esc'], function () { $('#write-tools-movie').prop('currentTime', TheShodo.Shodo.Write.videoFadeOutTiming); });

    this.prepareStage();

    this.showLoading();

    $('.write-stage').show();

    this.skipIntro = TheShodo.Shodo.Write.alwaysSkipIntro ||
                     Kazari.SessionStorage.getItem('TheShodo.Shodo.Write.skipIntro', false) ||
                     Kazari.LocalStorage.getItem('TheShodo.Shodo.Write.skipIntro', false);
}


TheShodo.Shodo.Write.prepareStage = function (ratio, mode) {
    TheShodo.Shodo.Write.preloadImages.push(TheShodo.sharedBaseUrl + '/res/img/frame.png');
}

TheShodo.Shodo.Write.showLoading = function () {
    // Loading...
    TheShodo.Shodo.Write.LoadingPanel.show();
//    var loadingPanel = new TheShodo.FloatingPanel('Loading',
//                                                  '<div>Loading Resources... (<span class="loadedCount">0</span> / <span class="totalCount">0</span>)</div>',
//                                                  { hasClose: false });

    var loadingWatcher = new Kazari.ResourceLoadingWatcher();
    loadingWatcher
        .register($('.write-container img').get().filter(function (e) { return e.tagName != 'image'; })) // filter [SVGImageElement]
        .register($('#top-menu img').get().filter(function (e) { return e.tagName != 'image'; })) // filter [SVGImageElement]
        .register(document.getElementById('write-tools-movie'))
        .register(this.preloadImages.map(function (e) { var img = document.createElement('img'); img.src = e; return img; }))
        .onProgress(function (loadedCount, totalCount) {
            if (window.console && window.console.log) {
                console.log('Resources: '+ loadedCount + '/' + totalCount + '; ' + loadingWatcher.watchTargets.map(function (e) { return (e.src || e.href || e.data || '<'+e.tagName+'>').toString().replace(/.*\//, ''); }).join(', '));
            }
        })
        .onComplete($.proxy(function () {
            TheShodo.Shodo.Write.LoadingPanel.close();
            TheShodo.Shodo.Write.onLoadingComplete();
        }, this))
        .start();
}

TheShodo.Shodo.Write.onLoadingComplete = function () {
    $('#write-shitajiki').fadeIn('fast', function () {
        $('#write-hanshi').fadeIn('slow', function () {
            $('#write-bunchin').fadeIn('slow', function () {
                if (TheShodo.Shodo.Write.skipIntro) {
                    // skip intro
                    TheShodo.Shodo.Write.initialize();
                } else {
                    // at first time (with introduction movie)
                    TheShodo.Shodo.Write.playIntro();
                }
            })
        })
    });
}

TheShodo.Shodo.Write.playIntro = function () {
    var videoE = $('#write-tools-movie')
        //.bind('ended', function(e) { $('#write-tools').fadeIn(); })
        .fadeIn()
        .bind('timeupdate', function(e) {
            if ($(this).prop('currentTime') > TheShodo.Shodo.Write.videoFadeOutTiming) {
                $(this).unbind('timeupdate', arguments.callee);
                
                // skip intro at next time
                Kazari.SessionStorage.setItem('TheShodo.Shodo.Write.skipIntro', true);
                
                // prepare
                TheShodo.Shodo.Write.initialize();
            }
        })
        .get(0)
    ;
    videoE.volume = 0;
    videoE.play();
}

TheShodo.Shodo.Write.initialize = function () {
    // Check Inline SVG
    // if (TheShodo.UA.isSVGSupported) {
    //     if ($('svg').get(0).namespaceURI == 'http://www.w3.org/2000/svg') {
    //         this.isUAInlineSVGSupported = true;
    //     }
    // }
    // show all elements & setup
    $('#write-tools-movie').fadeOut(this.videoFadeOutDuration, $.proxy(function () {
        // prepare
        // if (this.isUAInlineSVGSupported) {
            this.prepareCopybookSelection();
        // }

        this.attachButtonEvents();
        this.setupKeyEvents();
        this.initializeStrokeEngine();
    },this));


    // show tools
    // if (this.isUAInlineSVGSupported) {
        $('#top-menu .menu-copybook').css('display', 'inline-block');
    // }
    $('#top-menu').animate({ top: '0px' }, 'fast');
    $('#write-fude-medium').css('visibility', 'hidden');
    $('#write-tools-ink').fadeIn('fast');
    $('#write-tools-stage').fadeIn('fast', function () { $('body').addClass('write-ready'); });

    // Set Rollover
    /* $('.content a')
        .hover(function (e) {
            // in
            $(this).find('img.rollover').each(function (i, e) {
                e.src = e.src.replace(/(\.\w+)$/, '_o$1');
            });
        }, function (e) {
            // out
            $(this).find('img.rollover').each(function (i, e) {
                e.src = e.src.replace(/_o(\.\w+)$/, '$1');
            });
        }); */
}

TheShodo.Shodo.Write.prepareCopybookSelection = function () {
    // copybook
    var freeSelect = $('#copybook-select li:last-child');
    var copybookOrig = document.getElementById('copybook');
    var chars = copybookOrig.getElementsByTagName('g');
    for (var i = 0, n = chars.length; i < n; i++) {
        var gCloned = chars[i].cloneNode(true);
        var svgImage = copybookOrig.cloneNode(false);
        svgImage.appendChild(gCloned);
        svgImage.setAttribute('height', '32px');
        svgImage.setAttribute('width', '32px');
        gCloned.style.display = 'block';

        // var title = gCloned.getAttributeNS('http://www.w3.org/1999/xlink', 'title');
        
        // var image = gCloned.getElementsByTagName('image')[0];
        // var imageSrc;
        // if (image) {
        //     imageSrc = image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
        // }

        $('<li><a class="" href="#"><span class="label"><img src="" alt="" /></span></a></li>')
            .find('a')
                .addClass(gCloned.id)
                .prepend(svgImage)
                .end()
            // .find('.label img')
            //     .attr('src', imageSrc)
            //     .attr('alt', title)
            //     .end()
            .insertBefore(freeSelect)
        ;
    }
}


TheShodo.Shodo.Write.initializeStrokeEngine = function () {
    // setup/start StrokeManager/Engine
    var canvas = $('#write-canvas');
    var canvasE = canvas.get(0);
    var layeredCanvas = $('#layered-canvas');
    var layeredCanvasE = layeredCanvas.get(0);
    var handCanvas = $('#hand-canvas');

    // hand visiblity
    var isHandVisible = Kazari.LocalStorage.getItem('TheShodo.Shodo.Write.isHandVisible', true);
    $('#hand-visibility-checkbox').show().toggleClass('checked', isHandVisible);

    TheShodo.Shodo.Shared.StrokeEngine = new TheShodo.Shodo.StrokeEngine(canvasE.width, canvasE.height, canvas, layeredCanvasE);
    TheShodo.Shodo.Shared.StrokeManager = new TheShodo.Shodo.StrokeManager(handCanvas, TheShodo.Shodo.Shared.StrokeEngine);
    TheShodo.Shodo.Shared.StrokeManager.isHandVisible = isHandVisible;
    TheShodo.Shodo.Shared.StrokeManager.start();
}


//
// -- Configuration Methods ---------------------------------------------------
//
TheShodo.Shodo.Write.selectBrush = function (brushName) {
    /// <summary>Select a brush</summary>
    TheShodo.Shodo.Shared.StrokeManager.selectBrush(brushName);

    $('#write-tools-stage *').css('visibility', 'visible').animate({ opacity: 1 });
    $('#write-fude-' + brushName.toLowerCase()).css('visibility', 'hidden').animate({ opacity: 0 });
    $('#hand-image img').hide();
    $('#hand-image-' + brushName.toLowerCase()).show();
}

TheShodo.Shodo.Write.setBrushOpacity = function (opacity) {
    /// <summary>Set brush opacity</summary>
    TheShodo.Shodo.Shared.StrokeManager.setBrushOpacity(opacity);
}

TheShodo.Shodo.Write.setBrushColor = function (color) {
    /// <summary>Set brush color</summary>
    TheShodo.Shodo.Shared.StrokeManager.setBrushColor(color);

    // handImage Color
    /*
    var color = TheShodo.Shodo.Shared.StrokeManager.getBrushColor();
    $('#hand-image img').each(function (i, e) {
        var handImage = $(e);
        handImage.prop('src', handImage.prop('src').replace(/hand_([LMS]).*?\.png$/, 'hand_$1' + (
              (color == 0xE3632C) ? '_red'
            : (color == 0x56BC53) ? '_green'
            : (color == 0x597AB6) ? '_blue'
            : (color == 0xB6B615) ? '_yellow'
                                  : ''
        ) + '.png')); // color
    });*/
}

TheShodo.Shodo.Write.clear = function () {
    /// <summary>Show 'Clear' confirmation dialog</summary>
    var floatingPanel = new TheShodo.FloatingPanel.MessageBox('',
                                                              TheShodo.Shodo.Resources.Write.String.Panel_Clear_Label || 'Clear?',
                                                              [
                                                                  { label: TheShodo.Shodo.Resources.Write.String.Panel_Cancel || 'Cancel', isCancel: true, isDefault: true },
                                                                  { label: TheShodo.Shodo.Resources.Write.String.Panel_Delete || 'Yes',
                                                                    onClick: function (sender, e) {
                                                                          TheShodo.Shodo.Write.onClear(sender);
                                                                          sender.close();
                                                                    }
                                                                  },
                                                              ]);
    floatingPanel.show();
}

TheShodo.Shodo.Write.selectPaper = function (paperName) {
    /// <summary>Set Paper</summary>

    // select paper
    var paperNameWithMode = ((TheShodo.Shodo.Write.pageMode == '') ? '' : TheShodo.Shodo.Write.pageMode + '/') + paperName;

    TheShodo.Shodo.Write.currentPaper = paperName;
    $('#hanshi-image').attr('src', 'res/img/' + paperNameWithMode + '.png');
}

//
// -- Events ------------------------------------------------------------------
//

TheShodo.Shodo.Write.setupKeyEvents = function () {
    function isFloatingPanelOpened() { return TheShodo.FloatingPanel.Shared.currentPanelStack.length != 0; }

    this.commandHooker.clearMappings();
    this.commandHooker.addMapping(
        ['b'],
        function () {
            if (isFloatingPanelOpened()) return;

            switch (TheShodo.Shodo.Shared.StrokeEngine.currentBrush.name) {
                case 'Small':
                    TheShodo.Shodo.Write.selectBrush('Medium'); break;
                case 'Medium':
                    TheShodo.Shodo.Write.selectBrush('Large'); break;
                case 'Large':
                    TheShodo.Shodo.Write.selectBrush('Small'); break;
                default:
                    TheShodo.Shodo.Write.selectBrush('Medium'); break;
            }
        }
    );
    this.commandHooker.addMapping(['bs'], function () { if (!isFloatingPanelOpened()) TheShodo.Shodo.Write.clear(); });
    this.commandHooker.addMapping(['d'], function () { if (!isFloatingPanelOpened()) TheShodo.Shodo.Write.clear(); });
}

// Attach tools button events
TheShodo.Shodo.Write.attachButtonEvents = function () {
    // fude
    $('#write-tools-stage').click(TheShodo.Shodo.Write.onStageClicked);
    // ink
    $('#write-tools-ink').click(TheShodo.Shodo.Write.onInkClicked);

    // [Clear]
    $('#button-clear').click(TheShodo.Shodo.Write.onClearButtonClicked);
    // [Finish]
    $('#button-finish').click(TheShodo.Shodo.Write.onFinishButtonClicked);

    // [Copybook]
    $('#copybook-select a').click(TheShodo.Shodo.Write.onCopybookItemClicked);

    // [Paper]
    $('#paper-select a').click(TheShodo.Shodo.Write.onSelectPaperClicked);

    // Menus
    $('.close-menu').click(TheShodo.Shodo.Write.onMenuCloseClicked);
    $('.menu-folding > a:first-child').click(TheShodo.Shodo.Write.onMenuButtonClicked);

    // "show hand holding brush"
    $('#hand-visibility-checkbox').click(TheShodo.Shodo.Write.onHandCheckboxClicked);
}

// On "show hand holding brush" Clicked
TheShodo.Shodo.Write.onHandCheckboxClicked = function (e) {
    e.preventDefault();
    var isVisible = $(this).toggleClass('checked').hasClass('checked');
    TheShodo.Shodo.Shared.StrokeManager.isHandVisible = isVisible;
    Kazari.LocalStorage.setItem('TheShodo.Shodo.Write.isHandVisible', isVisible);
}

// On [Save to Gallery] Clicked
TheShodo.Shodo.Write.onSave = function (sender, e) {
    // to JSON
    var formE = $('form').get(0);
    var sendData = TheShodo.createDataFromForm(formE);
    sendData.Data = TheShodo.Shodo.Shared.StrokeManager.toDataURL('image/png');
    sendData.StrokeHistory = {
          Version:    2
        , Strokes:    JSON.stringify(TheShodo.Shodo.Shared.StrokeManager.strokeHistory)
        , Width:      TheShodo.Shodo.Shared.StrokeEngine.width
        , Height:     TheShodo.Shodo.Shared.StrokeEngine.height
        , Background: TheShodo.Shodo.Write.currentPaper
    };

    /*
    //if (window.console && window.console.log) console.log(JSON.stringify(data));

    TheShodo.Shodo.Write.LoadingPanel.show();
    */

    (function () {
        var today = new Date();
        var y = today.getFullYear();
        // JavaScript months are 0-based.
        var m = today.getMonth() + 1;
        var d = today.getDate();
        var h = today.getHours();
        var mi = today.getMinutes();
        var s = today.getSeconds();
        
        var anchor = document.createElement('a'),
            fileName = 'theshodo.com-revived-'
                + sendData["Tenkoku"].toUpperCase()
                + "-" + y + "-" + m + "-" + d + "-" + h + "-" + mi + "-" + s
                + '.png';

        // set a attributes
        anchor.setAttribute("href", sendData.Data);
        anchor.setAttribute('target', '_blank');
        anchor.setAttribute('download', fileName);

        // simulate click
        if (document.createEvent) {
            var evtObj = document.createEvent('MouseEvents');
            evtObj.initEvent('click', true, true);
            anchor.dispatchEvent(evtObj);
        }
        else if (anchor.click) {
            anchor.click();
        }
    })();

}

// On Ink Clicked
TheShodo.Shodo.Write.onInkClicked = function (e) {
    e.preventDefault();
    var panel = new TheShodo.Shodo.Write.PanelSelectInk();
    panel.onInkSelected = function (selectedOpacity, selectedColor) {
        TheShodo.Shodo.Write.setBrushColor(selectedColor);
        TheShodo.Shodo.Write.setBrushOpacity(selectedOpacity);
    };
    panel.show(TheShodo.Shodo.Shared.StrokeManager.getBrushOpacity(), TheShodo.Shodo.Shared.StrokeManager.getBrushColor());
}

// On Tools(Fude) Clicked
TheShodo.Shodo.Write.onStageClicked = function (e) {
    e.preventDefault();
    var panel = new TheShodo.Shodo.Write.PanelSelectBrush();
    panel.onBrushSelected = function (brushName) {
        TheShodo.Shodo.Write.selectBrush(brushName);
    };
    panel.show(TheShodo.Shodo.Shared.StrokeEngine.currentBrush.name);
}

// On "Select Paper" Clicked
TheShodo.Shodo.Write.onSelectPaperClicked = function (e) {
    e.preventDefault();

    TheShodo.Shodo.Write.selectPaper($(this).data('paper-name'));

    // mark
    $(this)
        .parents('menu').first()
            .find('li')
                .removeClass('selected')
                .end()
            .end().end()
        .parent()
            .addClass('selected')
    ;
}

// On [Finish] (top-menu) Clicked
TheShodo.Shodo.Write.onFinishButtonClicked = function (e) {
    e.preventDefault();
    
    // create clipped background-image
    var currentBackgroundImage = document.getElementById('hanshi-image');
    var tmpBackground = document.createElement('canvas');
    tmpBackground.height = TheShodo.Shodo.Shared.StrokeEngine.height;
    tmpBackground.width = TheShodo.Shodo.Shared.StrokeEngine.width;
    var ctx = tmpBackground.getContext('2d');
    var top = currentBackgroundImage.height - tmpBackground.height;
    ctx.drawImage(currentBackgroundImage, 0, -top, tmpBackground.width, tmpBackground.height+top);

    TheShodo.Shodo.Shared.StrokeEngine.backgroundImage = tmpBackground;

    var panel = new TheShodo.Shodo.Write.PanelFinish();
    panel.onSave = TheShodo.Shodo.Write.onSave;
    panel.show(TheShodo.Shodo.Shared.StrokeManager.toDataURL());
}

// On [Clear] (top-menu) clicked.
TheShodo.Shodo.Write.onClearButtonClicked = function (e) {
    e.preventDefault();
    TheShodo.Shodo.Write.clear();
}

// On Click Clear in floating panel.
TheShodo.Shodo.Write.onClear = function (e) {
    TheShodo.Shodo.Shared.StrokeManager.lock();

    var hanshiE = document.getElementById('write-hanshi');
    var bunchinE = document.getElementById('write-bunchin');
    var layeredE = document.getElementById('layered-canvas');

    var maxSize = 1;
    var initSize = 1;
    var duration = 300;

    var canvas = layeredE;
    var ctx = canvas.getContext('2d');

    // "syuwa-syuwa-" effect animation
    var currentImage = TheShodo.Shodo.Shared.StrokeEngine.getImage(true);
    Kazari.Animation.initialize()
        .addScene(function (state) {
            var easing = Kazari.JSTweener.easingFunctions.easeOutQuad;
            if (state.elapsed > duration) {
                state.onNext();
                return;
            }

            ctx.save();
            ctx.globalAlpha = 0.1;
            var value = (state.elapsed >= duration) ? maxSize : easing(state.elapsed, 0, maxSize, duration);
//            ctx.drawImage(currentImage,
//                          0, 0, canvas.width, canvas.height, /* src */
//                          0-value/2, 0-value/2, canvas.width + value, canvas.height + value /* dst */);

            [0, -value, value].forEach(function (left) {
                [0, -value, value].forEach(function (top) {
                    ctx.drawImage(currentImage,
                                  0, 0, canvas.width, canvas.height, /* src */
                                  top, left, canvas.width, canvas.height /* dst */);
                });
            });

            ctx.restore();
 
            // Opacity: 1 -> 0
            var opacity = (state.elapsed >= duration) ? 0 : easing(state.elapsed, 1, 0 - 1, duration);
            canvas.style.opacity = opacity;
        })
        .addScene(function (state) {
            TheShodo.Shodo.Shared.StrokeManager.unlock();
            TheShodo.Shodo.Shared.StrokeManager.clearHistory();
            canvas.style.opacity = 1;
            state.onNext();
        })
    ;
}

// On [Copybook]or[Paper] Clicked
TheShodo.Shodo.Write.onMenuButtonClicked = function (e) {
    e.preventDefault();
    var container = $(this).parent();

    var isOpened = container.hasClass('menu-opened');

    if (!isOpened) {
        // open
        $('#top-menu .menu-opened').removeClass('menu-opened').find('.submenu').hide();
    }

    container
        .toggleClass('menu-opened', !isOpened)
        .find('.submenu').fadeTo('fast', (isOpened ? 0 : 1), function () { $(this).toggle((isOpened ? false : true)); });

}

// On [Copybook]or[Paper] -> [x Close] Clicked
TheShodo.Shodo.Write.onMenuCloseClicked = function (e) {
    e.preventDefault();
    // close
    var smClose = $(this)
        .parents('.menu-folding')
        .find('.submenu');
    smClose.parent().removeClass('menu-opened');
    smClose.fadeOut('fast');
}

// On Copybook Selection Item selected
TheShodo.Shodo.Write.onCopybookItemClicked = function (e) {
    e.preventDefault();

    // select copybook
    $('#copybook-layer')
        .attr('class', $(this).attr('class'))
        .find('svg g')
            //.fadeOut()
            .hide()
            .end()
        .find('#' + $(this).attr('class'))
            .show()
            .css('opacity', 0)
            .animate({ opacity: 1 })
            //.fadeIn()
            .end();

    // mark
    $(this)
        .parents('menu').first()
            .find('li')
                .removeClass('selected')
                .end()
            .end().end()
        .parent()
            .addClass('selected')
    ;
}
