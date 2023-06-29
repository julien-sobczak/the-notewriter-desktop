#!/usr/bin/env python3
"""
Basic script to populate fake journal entries.

Usage:

    $ ./fixtures/journaling.py --start 2022-12-01 --end 2023-05-01 \
        --frequency 0.5 --activities Work,Hobbies

Examples:
$ ./fixtures/journaling.py --start 2023-03-01 --end 2023-05-01 --frequency 0.5 --activities Work fixtures/work
$ ./fixtures/journaling.py --start 2022-12-01 --end 2023-05-01 --frequency 0.8 --days MTWTFSS --activities Gratitude,Sport,Meditation,Family,Hobbies fixtures/life
"""

import argparse
from datetime import timedelta, datetime
from random import choices, randrange
import os

Activities = {
    "Gratitude": [
        "😘 Grateful for my morning cup of coffee",
        "😘 Grateful for living in a safe city",
        "😘 Grateful for my family",
        "😘 Grateful for feeling the wind while running",
        "😘 Grateful for eating a sorbet",
    ],
    "Sport": [
        "🏃 Run 10km",
        "🏃 Long Run",
        "🏋️ Exercise using Kettlebells",
        "🚴 Bike during one hour",
        "🏊 Swimming pool",
    ],
    "Meditation": [
        "🧘 Meditate",
        "🧘 Yoga",
    ],
    "Work": [
        "🏢 Meeting",
        "✍️ Completed design doc",
        "💻 Finished MR",
        "🍽️ Restaurant",
    ],
    "Family": [
        "🌴 Park",
        "🛝 Played with kids",
        "📺 Watched a great movie",
        "🍿 Cinema",
    ],
    "Hobbies": [
      "✍️ Wrote a blog post",
      "📚 Read a book",
      "🎶 Played music",
    ],
}

#
# CLI
#

parser = argparse.ArgumentParser(
            prog='Journaling',
            description='Generate entries in a journal')
parser.add_argument('--activities',
                      help="The list of possible activities",
                      type=lambda arg: arg.split(','),
                      default=[])
parser.add_argument('--days',
                      help="A cron-like pattern to select days",
                      default="MTWTF__") # Only week days
parser.add_argument('--frequency',
                      help="The frequency of journal entries between 0 and 1 (1 = every day)",
                      type=float,
                      default=1.0)
parser.add_argument('--start',
                      help="Start date of the journal",
                      required=True)
parser.add_argument('--end',
                      help="End date of the journal",
                      required=True)
parser.add_argument('dir', help="The journal/ directory to complete")


#
# Utils
#

def daterange(start_date, end_date):
    """
    Generator to hide the date traversal logic.
    """
    for n in range(int((end_date - start_date).days)):
        yield start_date + timedelta(n)


#
# Logic
#

def fill_journal(dir, today, activities):
    # Determine activities
    count_activities = randrange(1, 5)
    entries = ""
    for i in range(count_activities):
      activityType = activities[randrange(0, len(activities))]
      activityAction = Activities[activityType][randrange(0, len(Activities[activityType]))]
      entries += "* " + activityAction + "\n"
    year = today.strftime("%Y")
    date = today.strftime("%Y-%m-%d")

    # Generate the entry content
    entry = "# %s\n\n%s\n" % (date, entries)

    # Write the entry
    year_dir = os.path.join(dir, year)
    if not os.path.exists(year_dir):
      os.makedirs(year_dir)
    entry_filename = os.path.join(year_dir, date + ".md")
    with open(entry_filename, "w") as f:
      f.write(entry)


#
# Main
#

if __name__ == "__main__":

  # Argument parsing
  args = parser.parse_args()
  if not args.activities:
      args.activities = Activities.keys()
  # print(args.activities, args.days, args.frequency)

  # Iterate over the time range
  start_date = datetime.strptime(args.start, "%Y-%m-%d").date()
  end_date = datetime.strptime(args.end, "%Y-%m-%d").date()
  for today in daterange(start_date, end_date):

    # Apply filters
    if args.days[today.weekday()] == "_":
      # Skip this day
      continue

    if args.frequency != 1.0:
      fill_today = choices([True, False], [args.frequency, 1 - args.frequency])
      if not fill_today[0]:
        continue

    # Fill the entry
    fill_journal(args.dir, today, args.activities)
