<?php

it('redirects the home page to login or dashboard', function () {
    $this->get('/')->assertRedirect();
});
