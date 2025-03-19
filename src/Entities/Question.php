<?php

namespace Fehu\JZD\Entities;

class Question {
	protected string $question;

	protected string $answer;

	protected string $category;

	protected array $categoryMap = array(
		'ciekawostki'  => 'Ciekawostki',
		'literatura'   => 'Literatura',
		'motoryzacja'  => 'Motoryzacja',
		'muzyka'       => 'Muzyka',
		'nauki-scisle' => 'Nauki Scisłe',
		'sport'        => 'Sport',
		'film'         => 'Film',
		'styl-zycia'   => 'Styl Życia',
		'wb'           => 'Wielka Brytania'
	);

	public function __construct( string $question, string $answer, string $category ) {
		$this->question = $question;
		$this->answer   = $answer;
		$this->category = $this->categoryMap[ $category ];
	}

	public function getQuestion(): string {
		return $this->question;
	}

	public function getAnswer(): string {
		return $this->answer;
	}
}