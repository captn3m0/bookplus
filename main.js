$.expr[":"].contains = function(el, i, m) {
    var search = m[3];
    if (!search) return false;
    return eval("/" + search + "/i").test($(el).text());
};
function stopSpin(){
	$('#profile_container').show();
	$('#search').show();
	var target = document.getElementById('spin');
	if($.hasOwnProperty('spinner'))
		$.spinner.stop();
	$('#spin').hide();
}
function startSpin(){
	var opts = {
	  lines: 16, // The number of lines to draw
	  length: 24, // The length of each line
	  width: 5, // The line thickness
	  radius: 25, // The radius of the inner circle
	  color: '#000', // #rgb or #rrggbb
	  speed: 1.2, // Rounds per second
	  trail: 58, // Afterglow percentage
	  shadow: false // Whether to render a shadow
	};
	var target = document.getElementById('spin');
	$.spinner = new Spinner(opts).spin(target);
	$('#search').hide();
}
Storage.prototype.getItemOrCreateJSON = function(key,def){
	var item = localStorage.getItem(key);
	if(item == undefined){
		localStorage.setItem(key,JSON.stringify(def));
		return def;
	}
	else{
		return JSON.parse(item);
	}
}
/**
 * Fixes Images
 */ 
function img_load(img){
	if( ($(img).width()<20 && $(img).height() <20 )|| $(img).attr('src')==undefined)
		$(img).attr('src','./default_url.png');
	else if( $(img).width() > 45 || $(img).height() >45)
		$(img).width(45).height(45);
}
function img_error(img){
	$(img).attr('src','./default_url.png');
}
$(document).ready(function(){
	function refreshView(listOfIds){
		$('#urls tr').remove();
		$('#profiles').html('');
		$.each(listOfIds,function(index,elem){
			var filter=localStorage.getItemOrCreateJSON('filter',[]);
			if(filter.length>0){
				if(filter.indexOf(elem)<0)//This was not found in filter, but there is a filter
					return;
			}
			$('#profiles').append('<li>'+elem+'</li>');
			var pluses = JSON.parse(localStorage.getItem(elem));
			if(pluses != undefined){
				$.each(pluses,function(i,hash){
					var data = JSON.parse(localStorage.getItem(hash));
					addLinkView(data,elem);
					if(pluses.length-1==i)
					{
						if(listOfIds.length-1==index)
						{
							stopSpin();						
							console.log('Done');
						}
					}
				});
			}
			else{
				//lets scan it
			}
		});
	}
	//Once we are ready, first check and display stuff
	var listOfIds=localStorage.getItemOrCreateJSON('ids',[]);
	if(listOfIds.length > 0){
		refreshView(listOfIds);
	}
	else{
		$('#help_1').fadeIn('slow');
	}
	function addLinkView(data,userId){
		data.userid=userId;
		var html=$.srender('<tr userid="<%= userid %>"><td><a href="<%= url %>"><img onload="img_load(this);" onerror="img_error(this);" src="<%= image_url %>"></a></td><td><a class="title" href="<%= url %>" title="<%= url %>"><%= title %></a><br><a class="link "href="<%= url %>"><%= smaller_url %></a><p><%= description %></p></td></tr>',data);
		$(html).data('data',data);
		$('#urls').append(html);
	}
	/**
		We support multiple ids as well
	*/
	function addIdToDB(id){
		var current =localStorage.getItemOrCreateJSON('ids',[]);
		current.push(id);
		current = $.unique(current);
		localStorage.setItem('ids',JSON.stringify(current));
	}
	/**
	 * Link a +1 to an id
	 */
	function addPlusToId(id,hash){
		var pluses = localStorage.getItemOrCreateJSON(id,[]);
		if(pluses.indexOf(hash) > -1){
			return;//already added
		}
		else{
			pluses.push(hash);
			localStorage.setItem(id,JSON.stringify(pluses));
		}
	}
	function buildPlusStructure(id,desc,time,arr){
		//image issues
		if(arr[3]==undefined)
			arr[3]='https://ssl.gstatic.com/s2/oz/images/console/default_url.png';
		if(!$.isArray(arr))
			return false;
		return {
			"id":id,
			"time":time,
			"description":desc,
			"url":arr[0],
			"title":arr[1],
			"smaller_url":arr[2],
			"image_url":arr[3].substring(0,4)=='http'?arr[3]:'http://'+arr[3]
		};
	}
	/**
	 * This is the main parsng function
	 */
	function getPlus(id,ct){
		addIdToDB(id);
		if(ct != undefined)
			var url='https://plus.google.com/_/plusone/get?ct='+ct+'&oid='+id;
		else
			var url='https://plus.google.com/_/plusone/get?oid='+id;
		$.get(url,{},function(data){
			var pluses=parsePlus(data);
			$.pluses=pluses;
			var db = localStorage.getItemOrCreateJSON(id,[]);
			$.each(pluses[1][0],function(i,plus){
				var data,second_image;
				switch(plus.length){
					case 11:
					case 13:
						data=buildPlusStructure(plus[0],plus[2],plus[3],plus[4]);
						second_image=7;
						break;
					case 12:
					case 10:
						//Special case when there is no description
						data=buildPlusStructure(plus[0],'',plus[2],plus[3]);
						second_image=6;
						break;
					default:
						debugger;
				}
				//If there was an error
				if(data == false)
					return;
				var hash=hex_md5(data['url']+'');//Just to make sure it is a string
				if(localStorage.getItem(hash))
					return;//If this is already in localStorage.
				//Sometimes we have a better image :)
				if(typeof plus[second_image]=='string' && plus[second_image].length>3){
					var url=plus[second_image].split('url=')[1];
					if(url==undefined)
						debugger;
					url=url.split('&')[0];
					data['image_url']='http://images-pos-opensocial.googleusercontent.com/gadgets/proxy?url='+url+'&container=pos&resize_w=45';
				}
				if(typeof plus[second_image+1] == 'string' && plus[second_image+1].length>3)
					data['image_url']='http://images-pos-opensocial.googleusercontent.com/gadgets/proxy?url='+plus[second_image+1]+'&container=pos&resize_w=45';
				localStorage.setItem(hash, JSON.stringify(data));//Save this item in database
				addLinkView(data,id);//This displays the stuff
				addPlusToId(id,hash);
				/**
				 * If this is the last
				 */
				var ct = pluses[1][1];
				if(pluses[1].length==1 && pluses[1][0].length -1 == i){
					//If this was completed
					$('#spin').hide();
					$('#profile_container').show().html('URLs loaded successfully. Reloading this page in 5 seconds');
					setTimeout('document.location.reload();',5000);
				}
				else if(pluses[1][1] != undefined)
						getPlus(id,ct);//go go go
			});
		},'text');
	}
	function parsePlus(str,startCode){
		str=str.substring(6);//First 6 characters are rubbish
		str=str.replace(/,+/g,',');//There are multiple commas in the json
		return JSON.parse(str);//parse it
	}
	$('#setup_btn').click(function(){
		$('#help_1').hide();
		var id=$('#gplus_id').val();
		getPlus(id);
		$('#spin').show();
		startSpin();//Start Spinning
	});
	/**
	 * Searching !
	 */
	$('#searchtext').click(function(){
		//$('#urls tr').removeHighlight();
		var text=$(this).val();
		if(text==''){
			$('#urls tr').show();
			$('#urls tr').removeHighlight();
		}
	});
	$('#searchtext').change(function(){
		var text=$(this).val();
		if(text==''){
			$('#urls tr').show();
			$('#urls tr').removeHighlight();
		}
	});
	$('#searchtext').keyup(function(e){
		$('#urls tr').removeHighlight();
		$('#urls tr:visible').hide();
		var text=$(this).val();
		if(text=='')
			$('#urls tr').show();
		else{
			$('#urls td:last-child:contains("'+text+'")').parent().show();
			$('#urls td').highlight(text);
		}
	});
	$('#profiles li').click(function(){
		$('#urls tr').show();//show everything
		console.log($('#urls tr[userid!="'+$(this).text()+'"]').length);//hide what's not needed
		$('#urls tr[userid!="'+$(this).text()+'"]').hide();//hide what's not needed
	});
});
