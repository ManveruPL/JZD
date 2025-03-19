<?php

namespace Fehu\JZD\Engine\Round;

use Fehu\JZD\Engine\Round;
use Fehu\JZD\Entities\Question;
use Fehu\JZD\Exception\Game as GameException;

class First extends Round {

	/**
	 * Current player id
	 *
	 * @var string
	 */
	protected string $current_player_id;

	/**
	 * Current player seat.
	 *
	 * @var int
	 */
	protected int $current_seat = 0;

	/**
	 * @var int
	 */
	protected int $pass = 1;

	/**
	 * @var array
	 */
	protected array $incorrect_answers = [];

	/**
	 * Round will be ended when there will be no question
	 *
	 * @return bool
	 */
	public function check_round_end(): bool {
		return empty( $this->questions ) || $this->pass > 2;
	}

	/**
	 * Starts the round. Gets first player and first question from the list.
	 *
	 * @return array Return data for first question.
	 * @throws GameException
	 */
	public function start_round(): array {
		$this->current_player_id = $this->game->get_player_by_seat( $this->current_seat );
		$player                  = $this->game->get_player_by_id( $this->current_player_id );
		$question                = array_pop( $this->questions );

		return [
			'question' => $question,
			'player'   => $player,
		];
	}

	/**
	 * Gets the next question in round.
	 *
	 * @return array|false Returns data for next question or false if this is the round end
	 * @throws GameException
	 */
	public function next_question(): false|array {

		$this->current_seat ++;

		if ( $this->current_seat > $this->game->get_seats_count() ) {
			$this->current_seat = 0;
			$this->pass ++;
		}
		if ( $this->check_round_end() === true ) {
			return false;
		}

		$this->current_player_id = $this->game->get_player_by_seat( $this->current_seat );
		$player                  = $this->game->get_player_by_id( $this->current_player_id );
		$question                = $this->get_next_question();

		return [
			'question' => $question,
			'player'   => $player,
		];
	}

	/**
	 * Remove player chance if answer is incorrect, and then regardless plays next_question.
	 *
	 * @param bool $answer_correct
	 *
	 * @return array|false
	 * @throws GameException
	 */
	public function pass_player_answer( bool $answer_correct ): array|false {
		if ( ! $answer_correct ) {
			if ( array_key_exists( $this->current_player_id, $this->incorrect_answers ) ) {
				$this->game->update_player( $this->current_player_id, 'loose_game' );
			} else {
				$this->game->update_player( $this->current_player_id, 'loose_chance' );
			}
		}

		return $this->next_question();
	}
}