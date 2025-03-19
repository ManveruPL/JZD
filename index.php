<?php

use Fehu\JZD\Engine\Game;

defined( 'APPLICATION_PATH' ) or define( 'APPLICATION_PATH', __DIR__ . '/' );

require_once APPLICATION_PATH . 'vendor/autoload.php';

$game = new Game();
$game->run();
