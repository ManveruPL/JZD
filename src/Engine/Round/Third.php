<?php

namespace Fehu\JZD\Engine\Round;

use Fehu\JZD\Engine\Round;

class Third extends Round {

	public function check_round_end(): bool {
		return false;
	}


	public function start_round(): array {
		return array();
	}
}