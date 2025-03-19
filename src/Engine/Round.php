<?php

namespace Fehu\JZD\Engine;

use Fehu\JZD\Engine\Round\First;
use Fehu\JZD\Entities\Question;

abstract class Round {

	/**
	 * @var Game
	 */
	protected Game $game;

	/**
	 * @var Question[]
	 */
	protected array $questions;

	public function __construct( Game $game ) {
		$this->game = $game;
	}

	/**
	 * @return bool Return true if round can be ended.
	 */
	abstract public function check_round_end(): bool;

	/**
	 * Starts the round,
	 *
	 * @return array Returns data for first question.
	 */
	abstract public function start_round(): array;

	/**
	 * Gets the next questions
	 *
	 * @return Question|null Returns null if all questions were asked.
	 */
	public function get_next_question(): ?Question {
		if ( empty( $this->questions ) ) {
			return array_pop( $this->questions );
		}

		return null;
	}

	/**
	 * @param Question[] $questions
	 *
	 * @return Round
	 */
	public function set_questions( array $questions ): Round {
		$this->questions = $questions;

		return $this;
	}

}