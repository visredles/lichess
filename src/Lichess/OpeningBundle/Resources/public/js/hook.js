$(function() { 

    var $wrap = $('div.hooks_wrap');
    if (!$wrap.length) return;
    if (!$.websocket.available) return;

    var $chat = $("div.lichess_chat");
    var chatExists = $chat.length > 0;
    var $bot = $("div.lichess_bot");
    var $newposts = $("div.new_posts");
    var $newpostsinner = $newposts.find('.undertable_inner');
    var $hooks = $wrap.find('div.hooks');
    var $hooksTable = $hooks.find("table");
    var actionUrls = {
        'cancel': $hooks.data('cancel-url'),
        'join': $hooks.data('join-url')
    };
    var $userTag = $('#user_tag');
    var isRegistered = $userTag.length > 0
    var myElo = isRegistered ? parseInt($userTag.data('elo')) : null;
    var username = isRegistered ? $userTag.data("username") : "Anonymous";
    var hookOwnerId = $hooks.data('my-hook');
    var socket;

    if (chatExists) {
        var $form = $chat.find('form');
        $chat.find('.lichess_messages').scrollable();
        var $input = $chat.find('input.lichess_say').one("focus", function() {
            $input.val('').removeClass('lichess_hint');
        });

        // send a message
        $form.submit(function() {
            if ($input.hasClass("lichess_hint")) return false;
            var text = $.trim($input.val());
            if (!text) return false;
            if (text.length > 140) {
                alert('Max length: 140 chars. ' + text.length + ' chars used.');
                return false;
            }
            $input.val('');
            socket.send('talk', { u: username, txt: text });
            return false;
        });
        $chat.find('a.send').click(function() { $input.trigger('click'); $form.submit(); });

        // toggle the chat
        $chat.find('input.toggle_chat').change(function() {
            $chat.toggleClass('hidden', ! $(this).attr('checked'));
        }).trigger('change');
    }

    function addToChat(html) {
        $chat.find('.lichess_messages').append(html)[0].scrollTop = 9999999;
    }
    function buildChatMessage(txt, username) {
        var html = '<li><span>'
        html += '<a class="user_link" href="/@/'+username+'">'+username.substr(0, 12) + '</a>';
        html += '</span>' + urlToLink(txt) + '</li>';
        return html;
    }

    $bot.on("click", "tr", function() { location.href = $(this).find('a.watch').attr("href"); });
    $bot.find('.undertable_inner').scrollable();
    $newpostsinner.scrollable();
    $newpostsinner[0].scrollTop = 9999999;
    $newpostsinner.scrollable();
    setInterval(function() { 
      $.ajax($newposts.data('url'), {
        timeout: 10000,
        success: function(data) {
          $newpostsinner.find('ol').html(data);
          $newpostsinner[0].scrollTop = 9999999;
          $('body').trigger('lichess.content_loaded');
        } 
      });
    }, 60 * 1000);

    var $preload = $("textarea.hooks_preload");
    var preloadData = $.parseJSON($preload.val());
    $preload.remove();
    if (preloadData.redirect) {
      location.href = preloadData.redirect;
    } else {
      addHooks(preloadData.pool);
      renderTimeline(preloadData.timeline);
      if (chatExists) {
        var chatHtml = "";
        $.each(preloadData.chat, function() { chatHtml += buildChatMessage(this.txt, this.u); });
        addToChat(chatHtml);
      }
      socket = new $.websocket("ws://" + lichess.socketUrl + "/lobby/socket", preloadData.version, {
        params: {
          hook: hookOwnerId
        },
        events: {
          talk: function(e) { if (chatExists) addToChat(buildChatMessage(e.txt, e.u)); },
          entry: function(e) { renderTimeline([e]); },
          hook_add: addHook,
          hook_remove: removeHook,
          redirect: function(e) {
            $.lichessOpeningPreventClicks();
            location.href = 'http://'+location.hostname+'/'+e;
          }
        },
        options: {
          name: "lobby"
        }
      });
    }
    $('body').trigger('lichess.content_loaded');

    function renderTimeline(data) {
        var html = "";
        for (i in data) { html += '<tr>' + data[i] + '</tr>'; }
        $bot.find('.lichess_messages').append(html).parent()[0].scrollTop = 9999999;
    }

    function removeHook(id) {
        $("#" + id).find('td.action').addClass('empty').html("").end().fadeOut(500, function() {
          $(this).remove();
          updateHookTable();
        });
    }
    function addHooks(hooks) {
      var html = "";
      for (i in hooks) html += renderHook(hooks[i]);
      $hooksTable.append(html);
      updateHookTable();
    }
    function addHook(hook) {
      $hooksTable.append(renderHook(hook));
      updateHookTable();
    }
    function updateHookTable() {
      if (0 == $hooksTable.find('tr.hook').length) {
        $hooksTable.addClass('empty_table').html('<tr class="create_game"><td colspan="5">'+$.trans("No game available right now, create one!")+'</td></tr>');
      } else {
        $hooksTable.removeClass('empty_table').find('tr.create_game').remove();
      }
      resizeLobby();
      $hooksTable.find('a.join').click($.lichessOpeningPreventClicks);
    }

    function renderHook(hook) {
      if (!isRegistered && hook.mode == "Rated") return "";
      var html = "", isEngine, engineMark, userClass, mode, eloRestriction;
      hook.action = hook.ownerId ? "cancel" : "join";
      html += '<tr id="'+hook.id+'" class="hook'+(hook.action == 'join' ? ' joinable' : '')+'">';
      html += '<td class="color"><span class="'+hook.color+'"></span></td>';
      isEngine = hook.engine && hook.action == 'join';
      engineMark = isEngine ? '<span class="engine_mark"></span>' : '';
      userClass = isEngine ? "user_link engine" : "user_link";
      if (hook.elo) {
          html += '<td><a class="'+userClass+'" href="/@/'+hook.username+'">'+hook.username.substr(0, 12)+'<br />'+'('+hook.elo+')'+engineMark+'</a></td>';
      } else {
          html += '<td>'+hook.username+'</td>';
      }
      html += '</td>';
      eloRestriction = false;
      if (isRegistered) {
        mode = $.trans(hook.mode);
        if (hook.emin && (hook.emin >= 700 || hook.emax <= 2200)) {
          if (hook.action == "join" && (myElo < parseInt(hook.emin) || myElo > parseInt(hook.emax))) {
            eloRestriction = true;
          }
          mode += "<span class='elorange" + (eloRestriction ? ' nope' : '') + "'>" + hook.emin + ' - ' + hook.emax + '</span>';
        }
      } else {
        mode = "";
      }
      if (hook.variant == 'Chess960') {
          html += '<td><a href="http://en.wikipedia.org/wiki/Chess960"><strong>960</strong></a> ' + mode + '</td>';
      } else {
          html += '<td>'+mode+'</td>';
      }
      html += '<td>'+hook.clock+'</td>';
      if (eloRestriction) {
        html += '<td class="action empty"></td>';
      } else {
        html += '<td class="action">';
        if (hook.action == "cancel") {
          html += '<a href="'+actionUrls.cancel.replace(/\/0{12}/, '/'+hook.ownerId)+'" class="cancel"></a>';
        } else {
          var cancelParam = hookOwnerId ? "?cancel=" + hookOwnerId : ""
          html += '<a href="'+actionUrls.join.replace(/\/0{8}/, '/'+hook.id)+cancelParam+'" class="join"></a>';
        }
      }
      return html;
    }

    function resizeLobby() {
        $wrap.toggleClass("large", $hooks.find("tr").length > 6);
    }

    $hooks.on('click', 'table.empty_table tr', function() {
        $('#start_buttons a.config_hook').click();
    });
});
