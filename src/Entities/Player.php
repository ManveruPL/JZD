<?php

namespace Fehu\JZD\Entities;

class Player {
	/**
	 * @var string Player name
	 */
	protected string $name;

	/**
	 * @var int Player chances
	 */
	protected int $chances = 3;

	/**
	 * @var int Player points
	 */
	protected int $points = 0;

	/**
	 * @var int Finish time
	 */
	protected int $end = 0;

	/**
	 * @param string $name
	 */
	public function __construct( string $name ) {
		$this->name = $name;
	}

	public function get_chances(): int {
		return $this->chances;
	}

	public function loose_chance( $count = 1 ): Player {
		$this->chances -= $count;

		return $this;
	}

	public function get_points(): int {
		return $this->points;
	}

	public function add_points( int $points ): Player {
		$this->points += $points;

		return $this;
	}

	public function get_end(): int {
		return $this->end;
	}

	public function set_end( int $end ): Player {
		$this->end = $end;

		return $this;
	}
}