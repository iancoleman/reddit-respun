var settings = {
	new_feed_is_active: true,
	jsonp_timeout_wait_period: 3000,
	subreddit_keyup_delay: 1000,
	auth_token: "",
	is_logged_in: false,
	
	last_visited_subreddit: function(val) {
		var last_visited_subreddit = get_set("last_visited_subreddit", val)
		if (typeof(last_visited_subreddit) == undefined) {
			last_visited_subreddit = "all";
		}
		return last_visited_subreddit;
	},
	user: function(val) {
		return get_set("user", val);
	},
	modhash: function(val) {
		return get_set("modhash", val);
	}
}

get_set = function(key, val) {
	if (typeof(val) == "undefined") {
		return localStorage[key]
	}
	else {
		localStorage[key] = val;
	}
}

// Displays the data from reddit in the list and iframe,
// and handles the selection of new subreddits.
var Reddit_UI = function() {

	var $subreddit_input = $("#subreddit_input");
	var $reddit_list = $("#reddit_list");
	var $iframe = $("#reddit_content iframe");
	var $footer = $("#footer");

	var subreddit_input_keyup_event = null;
	var subreddit_jsonp_wait_event = null;

	var list_template = _.template($("#list_template").html());
	var footer_template = _.template($("#footer_template").html());

	init_elements = function() {
		init_subreddit_input();
	}

	init_subreddit_input = function() {
		var last_visited_subreddit = settings.last_visited_subreddit();
		$subreddit_input.val(last_visited_subreddit);
		//$subreddit_input.keyup(wait_to_fetch_new_subreddit);
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
		settings.last_visited_subreddit($subreddit_input.val());
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
	//fetch_new_subreddit();
}

var reddit_ui = new Reddit_UI();


// Handles user authentication and page personalisation,
// as well as up and downvotes.
var User = function() {
	/*
	 * in charge of
	 * getting the user auth_token
	 * saving and fetching the user auth_token and login status
	 * displaying login and default subreddits, or the user subreddits and logout
	 */
	var default_subreddits = ["All", "New", "Random", "funny", "pics", "WorldNews", "politics", "gaming", "WTF"];

	initialise_login = function() {
		var existing_user = settings.user();
		var existing_modhash = settings.modhash();

		if (existing_user != "" && existing_modhash != "") {
			hide_login();
			get_user_subreddits();
		}
		else {
			show_login();
			show_default_subreddits();
		}

		$("#login_button").click(function() {
			set_iframe_content();
			show_iframe();
		});
		$("#modhash_button").click(function() {
			save_login_credentials();
			hide_login();
			get_user_subreddits();
		});
		$("#logout_button").click(function() {
			perform_logout();
			show_login();
		});
	}

	set_iframe_content = function() {
		var template = _.template($("#login_form").html());
		var params = {
			user: $("#user").val(),
			password: $("#password").val(),
			endscript: "</script>"
		}
		var content = template(params);
		var form = "<html><body>" + content + "</body></html>";
		var form64 = btoa(form);
		var datauri = "data:text/html;base64," + form64;
		$("#login_iframe").attr("src", datauri);
	}

	show_iframe = function() {
		$("#login_stage_1").css("display", "none");
		$("#login_stage_2").css("display", "block");
	}

	save_login_credentials = function() {
		settings.user($("#user").val());
		settings.modhash($("#modhash").val());
	}

	show_login = function() {
		$("#login_form_container").css("display", "block");
		$("#logout_form_container").css("display", "none");
	}
	
	hide_login = function() {
		$("#login_form_container").css("display", "none");
		$("#logout_form_container").css("display", "block");
		$("#currently_logged_in_username").text(settings.user());
	}

	get_user_subreddits = function() {
		// Try to get user subreddits
		// If error, show login and error and show_default_subreddits()
		// show_user_subreddits()
	}

	show_default_subreddits = function() {
	}

	show_user_subreddits = function() {
	}

	perform_logout = function() {
		settings.user("");
		settings.modhash("");
		// TODO some ajax (maybe in iframe) to log the user out
	}

	initialise_login();
}

var user = new User();







// some utility functions

$.ajaxSetup({
	error: function(xhr, text, error) {
		console.log("AJAX ERROR"); // NB not called for jsonp, which we are using
		console.log([xhr, text, error]);
	}
});

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

