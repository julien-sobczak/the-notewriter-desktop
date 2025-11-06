# Maybe

## Generator: Books

`@interpreter: python3`

```python
from datetime import date

today = date.today()
one_year_ago = today.replace(year=today.year - 1).strftime("%Y-%m-%d")
ten_years_ago = today.replace(year=today.year - 10).strftime("%Y-%m-%d")

print(f"""
## ReadingList: My Reading List

* _Refactoring: Improving the Design of Existing Code_, by Martin Fowler, 1999 `@read_date: {ten_years_ago}` `#refactoring`
* _Clean Code, by Robert C. Martin_, 2008 `@read_date: 2023-11-20` `#clean-code` `#best-practices`
* _Code Complete, by Steve McConnell_, 1993 `@read_date: 2020-09-22` `#software` `#engineering`
* _The Pragmatic Programmer_, by Andrew Hunt and David Thomas, 1999 `@read_date: 2006-03-24` `#software` `#craftsmanship`
* _The Mythical Man-Month_, by Frederick P. Brooks Jr., 1975 `@read_date: 2011-10-20` `#management`
* _Programming Pearls_, by Jon Bentley, 1986 `@read_date: 2023-11-15` `#algorithms` `#problem-solving`
* _Working Effectively with Legacy Code_, by Michael Feathers, 2004 `@read_date: 2013-07-04` `#legacy` `#testing`
* _Structure and Interpretation of Computer Programs_, by Harold Abelson and Gerald Jay Sussman, 1985 `@read_date: 2005-07-10` `#lisp`
* _Introduction to Algorithms_, by Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein, 1990 `@read_date: 2011-02-21` `#algorithms`
* _Design Patterns: Elements of Reusable Object-Oriented Software_, by Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides, 1994 `@read_date: {one_year_ago}` `#design-patterns`
""")
```

## Generator: Conferences

`@interpreter: python3`

```python
from datetime import date, timedelta

today = date.today()
yesterday = today - timedelta(days=1)
soon = today + timedelta(days=5)
yesterday_date = yesterday.strftime("%Y-%m-%d")
soon_month = soon.strftime("%m")
soon_day = soon.strftime("%d")

print(f"""
## Todo: Attend conferences

* _PyCon US_, USA, `#reminder-every-${{year}}-04-01`
* _GopherCon_, USA, `#reminder-every-${{year}}-07-01`
* _JSConf EU_, Berlin (past), `#reminder-every-${{year}}-06-01`
* _React Conf_, USA, `#reminder-every-${{year}}-10-01`
* _NodeConf EU_, Ireland, `#reminder-every-${{year}}-11-01`
* _FOSDEM (Free and Open Source Developers’ European Meeting)_, Brussels, `#reminder-every-${{year}}-02-01`
* _DjangoCon US_, USA, `#reminder-every-${{year}}-09-01`
* _RustConf_, USA, `#reminder-every-${{year}}-09-01`
* _KubeCon + CloudNativeCon_, Global (rotating), `#reminder-every-${{year}}-05-01`
* _DevOpsDays_, Global (multiple cities), `#reminder-every-${{year}}-01-01`
* _FakeConf_, France, `#reminder-{yesterday_date}`
* _GenConf_, Douai, `#reminder-every-${{year}}-{soon_month}-{soon_day}`
""")
```
