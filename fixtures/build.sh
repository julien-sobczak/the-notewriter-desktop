#!/usr/bin/env bash

# Move into fixtures directory
cd $1

# Iterate over subdirectories
for subdir in $(find . -mindepth 1 -maxdepth 1 -type d); do
  echo "📁 Moving to $PWD/$subdir...";
  cd $PWD/$subdir;

  if [[ $PWD =~ "fixtures" ]]; then
    rm -Rf $PWD/.nt/{objects,refs,database.db,index}
    echo "🗑️ Cleaned $PWD/.nt";
  fi

  # Fixtures are already configured
  # No need to run "nt init"

  nt add .
  echo "✅ 'nt add' completed successfully";

  nt commit -m 'Initial commit'
  echo "✅ 'nt commit' completed successfully";

  cd $1
done


