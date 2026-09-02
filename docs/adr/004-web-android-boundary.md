# ADR 004: Web es el core y Android agrega capacidades nativas

## Status

Accepted

## Context

La PWA y el APK comparten producto, pero widgets, notificaciones, uso del
telefono y controles de bloqueo solo existen en Android.

## Decision

La raiz Web es la fuente de los assets empaquetados. El wrapper los sincroniza
con script y los carga mediante HTTPS local seguro. `AndroidBridge.getAppInfo`
es el marcador contractual actual del entorno APK. No constituye por si solo
autenticacion criptografica del runtime ni reemplaza las defensas WebView, CSP o
contra inyeccion de scripts. Los contratos nativos son versionados y el
importador aplica mutaciones idempotentes al modelo Workout canonico.

## Consequences

Browser/PWA no anuncian capacidades APK. Android no mantiene una segunda
implementacion completa de Gym. La copia de assets debe pasar paridad antes de
compilar.

## How to change this decision

Documentar el nuevo limite, versionar bridges/payloads, conservar compatibilidad
y cubrir Web, PWA, WebView, seguridad, paridad y hardware fisico.
