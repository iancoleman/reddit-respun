
var $subreddit = $("#subreddit");
var $list = $("#side_column");
var $iframe = $("#reddit_content iframe");
var $footer = $("#footer");
var $new_checkbox = $("#new_marquee_checkbox");
var $subscribed_subreddits = $("#subscribed_subreddits");

var subreddit_keyup_event = null;
var keyup_delay = 1000;

var subreddit_jsonp_wait_event = null;
var jsonp_wait_period = 3000;

var list_template = _.template($("#list_template").html());
var footer_template = _.template($("#footer_template").html());

var settings = {
	new_feed_is_active: true,
	last_visited_subreddit: "all"
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
	$subreddit.val(settings.last_visited_subreddit);
	$subreddit.keyup(wait_to_fetch_new_subreddit);
}

wait_to_fetch_new_subreddit = function(e) {
	set_subreddit_input_status("pending");
	clearTimeout(subreddit_keyup_event);
	if ($(e.target).val() != "") {
		if (e.keyCode == 13) {
			fetch_new_subreddit();
		}
		else {
			subreddit_keyup_event = setTimeout(fetch_new_subreddit, keyup_delay);
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
		$subreddit.removeClass(states[state_id].bg_color);
	}
	if (new_state in states) {
		$subreddit.addClass(states[new_state].bg_color);
		$list.text(states[new_state].text);
	}
}

fetch_new_subreddit = function() {
	jsonp_has_completed_successfully = false;
	set_subreddit_input_status("fetching");
	$.getJSON("http://www.reddit.com/r/" + $subreddit.val() +"/.json?jsonp=?", handle_new_subreddit_data);
	subreddit_jsonp_wait_event = setTimeout(handle_subreddit_jsonp_error, jsonp_wait_period);
}

handle_new_subreddit_data = function(data) {
	clearTimeout(subreddit_jsonp_wait_event);
	settings.last_visited_subreddit = $subreddit.val();
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
		div.addClass("side_column_row");
		div.html(content);
		div.data("reddit", reddit_data);
		div.on("click", reddit_data, show_reddit_in_iframe);
		$list.append(div);
	}
}

show_reddit_in_iframe = function(e) {
	$iframe.attr("src", e.data.url);
	$footer.html(footer_template(e.data));
}

init_elements();

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

