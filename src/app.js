

var Reddit = function() {

	var $subreddit_input = $("#subreddit_input");
	var $reddit_list = $("#reddit_list");
	var $iframe = $("#reddit_content iframe");
	var $footer = $("#footer");

	var subreddit_input_keyup_event = null;
	var subreddit_jsonp_wait_event = null;

	var list_template = _.template($("#list_template").html());
	var footer_template = _.template($("#footer_template").html());

	var settings = {
		new_feed_is_active: true,
		last_visited_subreddit: "all",
		jsonp_timeout_wait_period: 3000,
		subreddit_keyup_delay: 1000
	}

	$.ajaxSetup({
		error: function(xhr, text, error) {
			console.log("AJAX ERROR"); // NB not called for jsonp, which we are using
			console.log([xhr, text, error]);
		}
	});

	init_elements = function() {
		// TODO set the subreddit value to the last value the user had set it to
		init_subreddit_input();
		fetch_new_subreddit();
	}

	init_subreddit_input = function() {
		$subreddit_input.val(settings.last_visited_subreddit);
		$subreddit_input.keyup(wait_to_fetch_new_subreddit);
	}

	wait_to_fetch_new_subreddit = function(e) {
		set_subreddit_input_status("pending");
		clearTimeout(subreddit_input_keyup_event);
		if ($(e.target).val() != "") {
			if (e.keyCode == 13) {
				fetch_new_subreddit();
			}
			else {
				subreddit_input_keyup_event = setTimeout(fetch_new_subreddit, settings.subreddit_keyup_delay);
			}
		}
	}

	set_subreddit_input_status = function(new_state) {
		var states = {
			pending: { bg_color: "yellow_background", text: "waiting" },
			error: { bg_color: "red_background", text: "error" },
			success: { bg_color: "white_background", text: "" },
			fetching: { bg_color: "blue_background", text: "fetching" },
		}
		for (var state_id in states) {
			$subreddit_input.removeClass(states[state_id].bg_color);
		}
		if (new_state in states) {
			$subreddit_input.addClass(states[new_state].bg_color);
			$reddit_list.html("<div class='ajax_status'>" + states[new_state].text + "</div>");
		}
		if (new_state == "success") {
			$reddit_list.empty();
		}
	}

	fetch_new_subreddit = function() {
		jsonp_has_completed_successfully = false;
		set_subreddit_input_status("fetching");
		$.getJSON("http://www.reddit.com/r/" + $subreddit_input.val() +"/.json?jsonp=?", handle_new_subreddit_data);
		subreddit_jsonp_wait_event = setTimeout(handle_subreddit_jsonp_error, settings.jsonp_timeout_wait_period);
	}

	handle_new_subreddit_data = function(data) {
		clearTimeout(subreddit_jsonp_wait_event);
		settings.last_visited_subreddit = $subreddit_input.val();
		set_subreddit_input_status("success");
		display_reddits(data);
	}

	handle_subreddit_jsonp_error = function() {
		set_subreddit_input_status("error");
	}

	display_reddits = function(reddits) {
		var list = reddits.data.children;
		for (var i=0; i<list.length; i++) {
			var reddit_data = list[i].data;
			var content = list_template(reddit_data);

			// Backbone... nah... not to replace 6 lines of code
			var div = $(document.createElement("div"));
			div.addClass("reddit_list_row");
			div.html(content);
			div.data("reddit", reddit_data);
			div.on("click", reddit_data, show_reddit_in_iframe);
			$reddit_list.append(div);
		}
	}

	show_reddit_in_iframe = function(e) {
		$iframe.attr("src", e.data.url);
		$footer.html(footer_template(e.data));
	}

	init_elements();
}

var reddit = new Reddit();





Number.prototype.toFuzzyTime = function() {
	var s_gone = (new Date().getTime()/1000) - this;
	if (s_gone < 60) {
		return Math.floor(s_gone) + " seconds";
	}
	else if (s_gone < 3600) {
		return Math.floor(s_gone / 60) + " minutes";
	}
	else if (s_gone < 3600*24) {
		return Math.floor(s_gone / 3600) + " hours";
	}
	else {
		return Math.floor(s_gone / 3600*24) + " days";
	}
}

