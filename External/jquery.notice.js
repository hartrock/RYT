/*!
*	jQuery.noticeAdd() and jQuery.noticeRemove()
*	These functions create and remove growl-like notices
*		
*   Copyright (c) 2009 Tim Benniks
*
*	Permission is hereby granted, free of charge, to any person obtaining a copy
*	of this software and associated documentation files (the "Software"), to deal
*	in the Software without restriction, including without limitation the rights
*	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
*	copies of the Software, and to permit persons to whom the Software is
*	furnished to do so, subject to the following conditions:
*
*	The above copyright notice and this permission notice shall be included in
*	all copies or substantial portions of the Software.
*
*	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
*	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
*	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
*	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
*	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
*	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
*	THE SOFTWARE.
*	
*	@author 	Tim Benniks <tim@timbenniks.com>
* 	@copyright  2009 timbenniks.com
*	@version    $Id: jquery.notice.js 1 2009-01-24 12:24:18Z timbenniks $
*
*       [sr] from http://code.google.com/p/jquery-notice/downloads/detail?name=jquery.notice.1.0.1.zip
*       [sr][patch] uppercase 'X' instead of 'x' as close symbol: seems to be better than changing font size in css.
*       [sr][patch] new option appendOrPrepend: 'prepend' inserts a notice at the beginning
*       [sr][patch] return notice item inner for being able to manipulate it afterwards
*       [sr][patch] use width instead of height for notice collapse animation
*       [sr][patch] finalizing prop for noticeItemInner
**/
(function(jQuery)
{
	jQuery.extend({			
		noticeAdd: function(options)
		{	
			var defaults = {
				inEffect: 			{opacity: 'show'},	// in effect
				inEffectDuration: 	600,				// in effect duration in miliseconds
				stayTime: 			3000,				// time in miliseconds before the item has to disappear
				text: 				'',					// content of the item
				stay: 				false,				// should the notice item stay or not?
				type: 				'notice',			// could also be error, succes
				appendOrPrepend:		'append'		// could also be prepend
			}
			
			// declare varaibles
			var options, noticeWrapAll, noticeItemOuter, noticeItemInner, noticeItemClose;
								
			options 		= jQuery.extend({}, defaults, options);
			noticeWrapAll	= (!jQuery('.notice-wrap').length) ? jQuery('<div></div>').addClass('notice-wrap').appendTo('body') : jQuery('.notice-wrap');
			noticeItemOuter	= jQuery('<div></div>').addClass('notice-item-wrapper');
		  noticeItemInner	= jQuery('<div></div>').hide().addClass('notice-item ' + options.type);
                  if (options.appendOrPrepend === 'prepend') {
                    noticeItemInner.prependTo(noticeWrapAll);
                  } else { // if appendOrPrepend has 'append' or an unknown value, use default
                    noticeItemInner.appendTo(noticeWrapAll);
                  }
                  noticeItemInner.html('<p>'+options.text+'</p>').animate(options.inEffect, options.inEffectDuration).wrap(noticeItemOuter);
			noticeItemClose	= jQuery('<div></div>').addClass('notice-item-close').prependTo(noticeItemInner).html('X').click(function() { jQuery.noticeRemove(noticeItemInner) });
			
			// hmmmz, zucht
			if(navigator.userAgent.match(/MSIE 6/i)) 
			{
		    	noticeWrapAll.css({top: document.documentElement.scrollTop});
		    }
			
			if(!options.stay)
			{
				setTimeout(function()
				{
					jQuery.noticeRemove(noticeItemInner);
				},
				options.stayTime);
			}
                  return noticeItemInner; // for manipulating it later
		},
		
		noticeRemove: function(obj)
		{
                  obj.finalizing = true;
			obj.animate({opacity: '0'}, 600, function()
			{
				obj.parent().animate({width: '0px'}, 300, function()
				{
					obj.parent().remove();
				});
			});
		}
	});
})(jQuery);