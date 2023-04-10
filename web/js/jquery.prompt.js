//
// Prompt
// A Non-blocking popup!
// @author Andrew Dodson
// @since Jan 2012
// Modified with default text 
// Pål Kittilsen, April 2023
//
;(function($){

	$.fn.popup = function(message, defaultText){
			
		if(typeof(message) === 'function'){
			callback = message;
			message = null;
		}
		
		if(typeof(message) === 'string'){
			// wrap message
			message = $("<p>"+message+"</p>").get(0);
		}
		
		message = message || this;
		
		// cancel if open already, return an empty jQuery object
		if($('.jquery_prompt').length){return $();}

		// define callback
		callback = callback || function(p){return !!p;};
				
		// add `ESC` + `enter` listener
		var bind = function(e){
				if(e.which===27){
					$popup.find('form').trigger('reset');
				}
				else if (e.which === 13){
					$popup.find('form').trigger('submit');
				}
			};

		$(document).bind('keydown', bind );
		
		// build popup
		var $popup = $('<iframe class="jquery_prompt" allowtransparency=true frameborder="0" scrolling="auto" marginheight="0" marginwidth="0"></iframe><div class="jquery_prompt plugin"><form>'
						+'<div class="footer">'
						+'<input type="text" name="text" value="' + defaultText + '" style="display:none;"/>'
						+'<button type="reset" style="display:none;">Cancel</button>'
						+'<button type="submit" name="submit" value="1">Ok</button>'
						+'</div>'
					+'</form></div>')
				.prependTo("body")
				.find('form')
				.prepend(message)
				.submit(function(e){
					
					// trigger callback
					e.response = $('button[name=submit]',this).val() == 1 ? $('input[name=text]:visible',this).val() || true : false;

					try{
						callback.call(this, e);
					}
					catch(e){
						e.preventDefault();
						throw e;
					}

					if(!e.isDefaultPrevented()){
						// remove event listeners
						$(document).unbind('keydown', bind);

						// dont submit the form.
						e.preventDefault();
						
						// kill this popup
						$(this).parent().add($(this).parent().siblings('.jquery_prompt')).remove();
					}
					else{
						// reinstate the submit button if it was reset
						$('button[name=submit]', this).val('1');
					}
				})
				.bind('reset', function(){
					$('button[name=submit]', this).val(0);
					$(this).submit();
				})
				.find('button[type=submit]')
				.trigger('focus')
				.end()
				.end();
		

		return $popup;
	};

	$.fn.prompt = function(message,defaultText){
		return $(this).popup(message,defaultText).find("input[name=text], button").show().end();
	};

	$.fn.alert = function(message,defaultText){
		return $(this).popup(message,defaultText);
	};

	$.fn.confirm = function(message,defaultText){
		return $(this).popup(message,defaultText).find("button").show().end();
	};
	
})(jQuery);