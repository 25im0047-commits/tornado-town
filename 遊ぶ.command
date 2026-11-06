#!/bin/zsh
set -eu
game_dir="$(cd -- "$(dirname -- "$0")" && pwd)"
open "$game_dir/TORNADO-TOWN.html"
