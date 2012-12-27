var settings = {
	new_feed_is_active: true,
	jsonp_timeout_wait_period: 3000,
	subreddit_keyup_delay: 1000,
	auth_token: "",
	is_logged_in: false,
	total_posts_fetched: 0,
	last_post_name: "",
	
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
	},
	add_to_total_posts_fetched: function(json) {
		this.total_posts_fetched = this.total_posts_fetched + json.data.children.length;
	},
	reset_total_posts_fetched: function() {
		this.total_posts_fetched = 0;
	},
	set_last_post_name: function(json) {
		var last_index = json.data.children.length-1;
		settings.last_post_name = json.data.children[last_index].data.name;	
	},
	reset_last_post_name: function() {
		this.last_post_name = "";
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
		init_infinite_scroll();
	}

	init_subreddit_input = function() {
		var last_visited_subreddit = settings.last_visited_subreddit();
		$subreddit_input.val(last_visited_subreddit);
		$subreddit_input.keyup(wait_to_fetch_new_subreddit);
	}

	init_infinite_scroll = function() {
		var fetching = false;
		var check_if_should_fetch_interval = 2000; //ms
		setInterval(function() {
			var buffer = 100; //px
			var should_fetch = $reddit_list.scrollTop() > $reddit_list[0].scrollHeight - $reddit_list.height() - buffer &&
								$reddit_list.children().length > 0 &&
								$reddit_list.scrollTop() > 0
			if (should_fetch && !fetching) {
				fetching = true;
				infinite_scroll_jsonp_wait_event = setTimeout(handle_infinte_scroll_jsonp_error, settings.jsonp_timeout_wait_period);
				// TODO Display loading logo
				var next_set_url = "http://www.reddit.com/r/" + $subreddit_input.val() + "/.json?jsonp=?"
				next_set_url += "&count=" + settings.total_posts_fetched + "&after=" + settings.last_post_name;
				console.log("Infinte scrolling with url " + next_set_url);
				$.getJSON(next_set_url, function(json) {
					clearTimeout(infinite_scroll_jsonp_wait_event);
					display_reddits(json)
					// TODO Hide loading logo
					fetching = false;
					settings.add_to_total_posts_fetched(json);
					settings.set_last_post_name(json);
				})
			}
		}, check_if_should_fetch_interval);
	}

	handle_infinte_scroll_jsonp_error = function(data) {
		// TODO display error instead of loading
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
		set_subreddit_input_status("fetching");
		settings.reset_total_posts_fetched();
		settings.reset_last_post_name();
		$.getJSON("http://www.reddit.com/r/" + $subreddit_input.val() +"/.json?jsonp=?", handle_new_subreddit_data);
		subreddit_jsonp_wait_event = setTimeout(handle_subreddit_jsonp_error, settings.jsonp_timeout_wait_period);
	}

	handle_new_subreddit_data = function(json) {
		clearTimeout(subreddit_jsonp_wait_event);
		settings.last_visited_subreddit($subreddit_input.val());
		set_subreddit_input_status("success");
		display_reddits(json);
		settings.add_to_total_posts_fetched(json);
		settings.set_last_post_name(json);
	}

	handle_subreddit_jsonp_error = function() {
		set_subreddit_input_status("error");
	}

	display_reddits = function(reddits) {
		var list = reddits.data.children;
		for (var i=0; i<list.length; i++) {
			var reddit_data = list[i].data;
			reddit_data.list_index = settings.total_posts_fetched + i + 1; // Ugly magic numbers...
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

	this.show_subreddits = function(subreddit_list) {
		set_subreddit_list_width();
		var template = _.template($("#subreddits_list_template").html());
		var content = template({subreddits: subreddit_list});
		$("#subreddits").html(content);
		$("#subreddits a").click(function(e) {
			$subreddit_input.val($(e.target).text());
			fetch_new_subreddit();
		});
	}

	set_subreddit_list_width = function() {
		var page_width = $("#personalisation").width();
		var subreddit_input_width = $("#subreddit_input_container").width();
		var loginout_width = $("#login_form_container").width();
		if ($("#logout_form_container").css("display") == "block") {
			loginout_width = $("#logout_form_container").width();
		}
		var calculated_width = page_width - subreddit_input_width - loginout_width - 5; // Magic number is so annoying
		$("#subreddits").css("width", calculated_width);
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
	 * passing subreddits to Reddit_UI for display
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
		$("#login_password").keyup(function(e) {
			if (e.keyCode == 13) {
				$("#login_button").click();
			}
		})
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
		// A bit of a trick here, using datauri to set the iframe content,
		// which allows all the code to be contained in one file rather than
		// a second html file to populate the iframe.
		var template = _.template($("#login_form").html());
		var params = {
			user: $("#login_username").val(),
			password: $("#login_password").val(),
			endscript: "</script>"
		}
		var content = template(params);
		console.log(content);
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
		settings.user($("#login_username").val());
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
		show_default_subreddits();
	}

	show_default_subreddits = function() {
		reddit_ui.show_subreddits(default_subreddits);
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

