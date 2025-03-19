<?php

namespace Fehu\JZD\Engine;

use Fehu\JZD\Engine\Round\First;
use Fehu\JZD\Engine\Round\Second;
use Fehu\JZD\Engine\Round\Third;
use Fehu\JZD\Entities\Player;
use Fehu\JZD\Entities\Question;
use Fehu\JZD\Exception\Game as GameException;

class Game {

	/**
	 * @var int Round
	 */
	protected int $round = 1;

	/**
	 * @var Player[]
	 */
	protected array $players;

	/**
	 * @var array
	 */
	protected array $player_order;

	/**
	 * @var First
	 */
	protected First $round_one;

	protected Second $round_two;

	protected Third $round_three;

	/**
	 * @param int $round
	 */
	public function __construct() {
		$this->round_one   = new First( $this );
		$this->round_two   = new Second( $this );
		$this->round_three = new Third( $this );

		$this->load_questions();
	}


	/**
	 * Run the game
	 *
	 * @return void
	 * @throws GameException
	 */
	public function run(): void {
		if ( count( $this->players ) < 5 ) {
			throw new GameException( "To play there must be at least 5 players, but not more than 10" );
		}

		shuffle( $this->player_order );

		$this->round_one->start_round();
	}

	/**
	 * @param string $player_name Name of the player to add
	 *
	 * @return Game
	 * @throws GameException
	 */
	public function add_player( string $player_name ): Game {
		if ( count( $this->players ) >= 10 ) {
			throw new GameException( "You cannot add more than 10 players" );
		}
		if ( empty( $player_name ) ) {
			throw new GameException( "You must specify player name" );
		}
		$player                     = new Player( $player_name );
		$playerId                   = spl_object_hash( $player );
		$this->players[ $playerId ] = $player;
		$this->player_order[]       = $playerId;

		return $this;
	}

	/**
	 * Retrives player of specified ID.
	 *
	 * @param string $player_id
	 *
	 * @return Player
	 * @throws GameException
	 */
	public function get_player_by_id( string $player_id ): Player {
		if ( array_key_exists( $player_id, $this->players ) ) {
			return $this->players[ $player_id ];
		}
		throw new GameException( "Player not found" );
	}

	/**
	 *  Retrieves player id on the specified seat
	 *
	 * @param int $id
	 *
	 * @return string
	 * @throws GameException
	 */
	public function get_player_by_seat( int $id = 0 ): string {
		if ( array_key_exists( $id, $this->player_order ) ) {
			return $this->player_order[ $id ];
		}
		throw new GameException( "Player not found" );
	}

	public function get_seats_count(): int {
		return count( $this->player_order );
	}

	/**
	 * @throws GameException
	 */
	public function update_player( $player_id, $action ): Game {
		$player = $this->get_player_by_id( $player_id );

		if ( $action === 'loose_chance' ) {
			$player->loose_chance();
		} else if ( $action === 'loose_game' ) {
			$player->loose_chance( 2 );
			$player_seat = array_search( $player_id, $this->player_order );
			unset( $this->player_order[ $player_seat ] );
		}

		return $this;
	}

	/**
	 * Loads the questions for the game.
	 *
	 * @return void
	 */
	protected function load_questions(): void {
		$questions = json_decode( file_get_contents( APPLICATION_PATH . 'data/questions.json' ), true );

		$this->round_one->set_questions( $this->get_random_questions( 20, $questions ) );
		$this->round_two->set_questions( $this->get_random_questions( 500, $questions ) );
		$this->round_three->set_questions( $this->get_random_questions( 60, $questions ) );
	}

	/**
	 * Get random count of questions from the specified database
	 *
	 * @param int $count How many questions to load
	 * @param array $questions Array of questions database
	 *
	 * @return Question[] Returns array of questions.
	 */
	protected function get_random_questions( int $count, array &$questions ): array {
		$result = array();
		$keys   = array_rand( $questions, $count );
		foreach ( $keys as $key ) {
			$result[] = new Question( ...$questions[ $key ] );
			unset( $questions[ $key ] );
		}

		return $result;
	}

}