<?php

$vendorDir = realpath(__DIR__.'/../vendor');
$srcDir = realpath(__DIR__.'/../src');

use Symfony\Component\ClassLoader\UniversalClassLoader;

$loader = new UniversalClassLoader();
$loader->registerNamespaces(array(
    'Symfony'                        => $vendorDir.'/symfony/src',
    'Doctrine\\MongoDB'              => $vendorDir.'/mongodb-odm/lib/vendor/doctrine-mongodb/lib',
    'Doctrine\\ODM\\MongoDB'         => $vendorDir.'/mongodb-odm/lib',
    'Doctrine\\Common\\DataFixtures' => $vendorDir.'/doctrine-data-fixtures/lib',
    'Doctrine\\Common'               => $vendorDir.'/mongodb-odm/lib/vendor/doctrine-common/lib',
    'DoctrineExtensions'             => $vendorDir.'/Doctrine2-Sluggable-Functional-Behavior/lib',
    'Bundle'                         => $srcDir,
    'FOS'                            => $srcDir,
    'Application'                    => $srcDir,
    'ZendPaginatorAdapter'           => $vendorDir.'/ZendPaginatorAdapter/src',
    'Zend'                           => $vendorDir.'/zend/library'
));
$loader->registerPrefixes(array(
    'Twig_'  => $vendorDir.'/twig/lib'
));
$loader->register();
