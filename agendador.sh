#!/bin/sh
# Roda a agenda a cada hora; ela só produz o que falta no dia (canal.json → agenda.por_dia)
while true; do
  node fabrica.js agenda
  sleep 3600
done
