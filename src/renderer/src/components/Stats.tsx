/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useContext, useMemo } from 'react'
import { Pie } from '@nivo/pie'
import { Line } from '@nivo/line'
import { Calendar } from '@nivo/calendar'
import { Choropleth } from '@nivo/geo'
import { Sunburst } from '@nivo/sunburst'
import worldFeatures from '../assets/world_countries.json'
import { StatConfig, MediaDirStat, CountStat } from '@renderer/Model'
import Loader from './Loader'
import { ConfigContext, getSelectedRepositorySlugs, selectedStats } from '@renderer/ConfigContext'
import {
  format,
  parseISO,
  eachDayOfInterval,
  subDays,
  subMonths,
  subYears,
  isAfter
} from 'date-fns'

// Helper function to generate a slug from a string
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Helper function to generate a grayscale color based on value position
function color(value: number, minValue: number, maxValue: number): string {
  if (maxValue === minValue) {
    return 'hsl(0, 0%, 50%)'
  }
  const position = (value - minValue) / (maxValue - minValue)
  const lightness = 90 - position * 60 // Range from 90% (light) to 30% (dark)
  return `hsl(0, 0%, ${lightness}%)`
}

const chartCommonAttributes = {
  height: 350,
  width: 350,
  margin: { top: 75, right: 75, bottom: 75, left: 75 }
}

// PieChart component
function PieChart({ name, data }: { name: string; data: CountStat[] }) {
  if (!data || data.length === 0) return

  const vals = data.map((s) => s[1])
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)
  const chartData = data.map(([label, count]) => ({
    id: slugify(label),
    label: label,
    value: count,
    color: color(count, minV, maxV)
  }))

  return (
    <div className="StatsChart">
      <h3>{name}</h3>
      <Pie
        {...chartCommonAttributes}
        data={chartData}
        innerRadius={0.5}
        padAngle={0.7}
        cornerRadius={3}
        activeOuterRadiusOffset={8}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
      />
    </div>
  )
}

// MapChart component
function MapChart({
  name,
  data,
  mapping
}: {
  name: string
  data: CountStat[]
  mapping: { [key: string]: string }
}) {
  if (!data || data.length === 0) return

  const chartData = data.map(([label, count]) => {
    const mappedId = mapping ? mapping[label] : label
    return {
      id: mappedId || label,
      value: count,
      label: label
    }
  })

  // Determine min and max values for color scaling
  const vals = data.map((s) => s[1])
  const minV = Math.min(...vals)
  const maxV = Math.max(...vals)

  return (
    <div className="StatsChart StatsChartWide">
      <h3>{name}</h3>
      <Choropleth
        {...chartCommonAttributes}
        width={chartCommonAttributes.width * 2} // Wider for maps
        data={chartData}
        colors="nivo"
        features={worldFeatures.features}
        domain={[minV, maxV]}
        unknownColor="white"
        label="properties.name"
        valueFormat={(value) => Math.ceil(value).toString()}
        enableGraticule={false}
        borderWidth={0.5}
        borderColor="#152538"
        legends={[
          {
            anchor: 'bottom-left',
            direction: 'column',
            justify: true,
            translateX: 20,
            translateY: -100,
            itemsSpacing: 0,
            itemWidth: 94,
            itemHeight: 18,
            itemDirection: 'left-to-right',
            itemTextColor: '#444444',
            itemOpacity: 0.85,
            symbolSize: 18
          }
        ]}
      />
    </div>
  )
}

// TimelineChart component
function TimelineChart({ name, data }: { name: string; data: CountStat[] }) {
  const [filter, setFilter] = useState<'week' | 'month' | 'year' | 'all'>('month')

  if (!data || data.length === 0) return

  // Fill missing dates
  const dateLabels = data.map(([label]) => label)
  const dateObjs = dateLabels.map((d) => parseISO(d))
  const minDate = dateObjs.length
    ? new Date(Math.min(...dateObjs.map((d) => d.getTime())))
    : new Date()
  const maxDate = dateObjs.length
    ? new Date(Math.max(...dateObjs.map((d) => d.getTime())))
    : new Date()

  // Build a map for fast lookup
  const countMap = new Map<string, number>(data.map(([label, count]) => [label, count]))

  // Fill all dates in interval
  const allDates = eachDayOfInterval({ start: minDate, end: maxDate })
  const filledData: CountStat[] = allDates.map((date: Date) => {
    const label = format(date, 'yyyy-MM-dd')
    return [label, countMap.get(label) ?? 0]
  })

  // Filtering logic
  let filteredData: CountStat[] = filledData
  const today = maxDate
  if (filter === 'week') {
    const from = subDays(today, 6)
    filteredData = filledData.filter(([label]) => isAfter(parseISO(label), subDays(from, 1)))
  } else if (filter === 'month') {
    const from = subMonths(today, 1)
    filteredData = filledData.filter(([label]) => isAfter(parseISO(label), subDays(from, 1)))
  } else if (filter === 'year') {
    const from = subYears(today, 1)
    filteredData = filledData.filter(([label]) => isAfter(parseISO(label), subDays(from, 1)))
  }
  // 'all' shows everything

  const chartData = [
    {
      id: slugify(name),
      data: filteredData.map(([label, count]) => ({
        x: label,
        y: count
      }))
    }
  ]

  return (
    <div className="StatsChart">
      <h3>{name}</h3>
      <div className="StatsChartFilterButtons">
        Last:
        <button onClick={() => setFilter('week')} disabled={filter === 'week'}>
          week
        </button>
        <button onClick={() => setFilter('month')} disabled={filter === 'month'}>
          month
        </button>
        <button onClick={() => setFilter('year')} disabled={filter === 'year'}>
          year
        </button>
        <button onClick={() => setFilter('all')} disabled={filter === 'all'}>
          all
        </button>
      </div>
      <Line
        {...chartCommonAttributes}
        data={chartData}
        xScale={{ type: 'point' }}
        yScale={{
          type: 'linear',
          min: 'auto',
          max: 'auto',
          stacked: false,
          reverse: false
        }}
        curve="step"
        enableGridX={false}
        axisTop={null}
        axisRight={null}
        axisBottom={null}
        axisLeft={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'count',
          legendOffset: -40,
          legendPosition: 'middle'
        }}
        pointSize={10}
        pointColor={{ theme: 'background' }}
        pointBorderWidth={2}
        pointBorderColor={{ from: 'serieColor' }}
        pointLabelYOffset={-12}
        useMesh={false}
      />
    </div>
  )
}

// CalendarChart component
function CalendarChart({ name, data }: { name: string; data: CountStat[] }) {
  const [selectedYear, setSelectedYear] = useState<number>(0)

  // Refresh chartData, from, and to when selectedYear changes
  const { chartData, from, to } = useMemo(() => {
    const filtered = data
      .filter(([label]) => parseISO(label).getFullYear() === selectedYear)
      .map(([label, count]) => ({
        day: label,
        value: count
      }))
    return {
      chartData: filtered,
      from: `${selectedYear}-01-01`,
      to: `${selectedYear}-12-31`
    }
  }, [data, selectedYear])

  if (!data || data.length === 0) return

  // Extract years from data labels
  const years = Array.from(new Set(data.map(([label]) => parseISO(label).getFullYear()))).sort(
    (a, b) => b - a
  )

  return (
    <div className="StatsChart StatsChartWide">
      <h3>{name}</h3>
      <div className="StatsChartFilterButtons">
        <label>
          Year:&nbsp;
          <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {years.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Calendar
        {...chartCommonAttributes}
        width={chartCommonAttributes.width * 2} // Wider for maps
        data={chartData}
        from={from}
        to={to}
        emptyColor="#eeeeee"
        colors={['#61cdbb', '#97e3d5', '#e8c1a0', '#f47560']}
        margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
        yearSpacing={40}
        monthBorderColor="#ffffff"
        dayBorderWidth={2}
        dayBorderColor="#ffffff"
      />
    </div>
  )
}

// SunburstMediaChart component
function SunburstMediaChart({ name, data }: { name: string; data: MediaDirStat[] }) {
  if (!data || data.length === 0) return

  // Build sunburst data structure
  const rootNode: any = {
    id: '.',
    children: []
  }

  // Group by top-level directory
  const topLevelDirs: Map<string, MediaDirStat[]> = new Map()
  const rootFiles: MediaDirStat[] = []

  for (const stat of data) {
    if (stat.relativePath === '/') {
      rootFiles.push(stat)
    } else {
      const parts = stat.relativePath.split('/')
      const topDir = parts[0]
      if (!topLevelDirs.has(topDir)) {
        topLevelDirs.set(topDir, [])
      }
      topLevelDirs.get(topDir)!.push(stat)
    }
  }

  // Add root files
  if (rootFiles.length > 0) {
    const rootSize = rootFiles.reduce((sum, s) => sum + s.size, 0)
    rootNode.children.push({
      id: '/',
      value: rootSize
    })
  }

  // Add top-level directories
  for (const [topDir, stats] of topLevelDirs) {
    const dirNode: any = {
      id: topDir,
      children: []
    }

    for (const stat of stats) {
      dirNode.children.push({
        id: stat.relativePath,
        value: stat.size
      })
    }

    rootNode.children.push(dirNode)
  }

  return (
    <div className="StatsChart">
      <h3>{name}</h3>
      <Sunburst
        {...chartCommonAttributes}
        data={rootNode}
        cornerRadius={2}
        borderWidth={1}
        borderColor={{ theme: 'background' }}
        colors={{ scheme: 'nivo' }}
        childColor={{ from: 'color', modifiers: [['brighter', 0.1]] }}
        enableArcLabels
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 1.5]] }}
      />
    </div>
  )
}

function Stats() {
  const { config } = useContext(ConfigContext)
  const editorConfig = config.config

  const [loading, setLoading] = useState<boolean>(true)
  const [objectCountData, setObjectCountData] = useState<CountStat[]>([])
  const [noteTypeData, setNoteTypeData] = useState<CountStat[]>([])
  const [mediaDiskUsageData, setMediaDiskUsageData] = useState<MediaDirStat[]>([])
  const [customStats, setCustomStats] = useState<
    Array<{
      config: StatConfig
      data: any
    }>
  >([])
  const [dailyMetricsStats, setDailyMetricsStats] = useState<
    Array<{
      name: string
      type: string
      data: CountStat[]
    }>
  >([])

  useEffect(() => {
    const loadStatistics = async () => {
      setLoading(true)

      // Get selected repository slugs
      const selectedRepositorySlugs = getSelectedRepositorySlugs(editorConfig)

      try {
        // Load default graphs

        // 1. Object Count
        const objectCounts = await window.api.countObjects(selectedRepositorySlugs)
        setObjectCountData(Array.from(objectCounts.entries()).map(([kind, count]) => [kind, count]))

        // 2. Note Type Count
        const noteTypeStats = await window.api.getNoteStatistics(
          selectedRepositorySlugs,
          '',
          'type'
        )
        setNoteTypeData(noteTypeStats)

        // 3. Media Disk Usage
        const mediaDirStats: MediaDirStat[] =
          await window.api.getMediasDiskUsage(selectedRepositorySlugs)
        setMediaDiskUsageData(mediaDirStats)

        // Load custom stats from repository configs
        const customStatsData: Array<{ config: StatConfig; data: CountStat[] }> = []

        const allStats = selectedStats(config)
        const statPromises = allStats.map(async (statWithContext) => {
          const data = await window.api.getNoteStatistics(
            [statWithContext.repositorySlug],
            statWithContext.query,
            statWithContext.groupBy,
            statWithContext.value
          )
          return {
            config: statWithContext,
            data: data
          }
        })

        const repoStats = await Promise.all(statPromises)
        customStatsData.push(...repoStats)

        setCustomStats(customStatsData)

        // Load daily metrics from repository configurations
        const dailyMetricsMap = new Map<string, { name: string; type: string }>()

        // Collect all unique daily metrics across selected repositories
        for (const repositorySlug of selectedRepositorySlugs) {
          const repositoryConfig = config.repositories[repositorySlug]
          if (!repositoryConfig || !repositoryConfig.attributes) continue

          // Find all attributes marked as daily metrics
          for (const [attrName, attrConfig] of Object.entries(repositoryConfig.attributes)) {
            if (attrConfig.dailyMetrics && !dailyMetricsMap.has(attrName)) {
              dailyMetricsMap.set(attrName, {
                name: attrConfig.name,
                type: attrConfig.type
              })
            }
          }
        }

        // Load data for each daily metric from all selected repositories
        const dailyMetricsData: Array<{ name: string; type: string; data: CountStat[] }> = []
        for (const [attrName, metricInfo] of dailyMetricsMap.entries()) {
          const data = await window.api.getNoteStatistics(
            selectedRepositorySlugs,
            '@type:Journal',
            'date',
            attrName
          )

          dailyMetricsData.push({
            name: metricInfo.name,
            type: metricInfo.type,
            data: data
          })
        }

        setDailyMetricsStats(dailyMetricsData)
      } catch (error) {
        console.error('Error loading statistics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStatistics()
  }, [])

  return (
    <div className="Stats Screen">
      {loading && <Loader />}
      {!loading && (
        <>
          {/* Default Graphs */}
          <PieChart name="Objects" data={objectCountData} />
          <PieChart name="Note Types" data={noteTypeData} />
          <SunburstMediaChart name="Media Storage" data={mediaDiskUsageData} />

          {/* Custom Stats from Config */}
          {customStats.map((stat) => {
            const key = `${stat.config.name}-${stat.config.visualization}`
            if (stat.config.visualization === 'pie') {
              return <PieChart key={key} name={stat.config.name} data={stat.data} />
            }
            if (stat.config.visualization === 'map' && stat.config.mapping) {
              return (
                <MapChart
                  key={key}
                  name={stat.config.name}
                  data={stat.data}
                  mapping={stat.config.mapping}
                />
              )
            }
            if (stat.config.visualization === 'timeline') {
              return <TimelineChart key={key} name={stat.config.name} data={stat.data} />
            }
            if (stat.config.visualization === 'calendar') {
              return <CalendarChart key={key} name={stat.config.name} data={stat.data} />
            }
            return null
          })}

          {/* Daily Metrics */}
          {dailyMetricsStats.map((metric) => {
            const key = `daily-metric-${metric.name}`
            const metricType = metric.type.toLowerCase()

            // Render TimelineChart for integer/float types
            if (metricType === 'integer' || metricType === 'float') {
              return <TimelineChart key={key} name={metric.name} data={metric.data} />
            }

            // Render CalendarChart for boolean/bool types
            if (metricType === 'boolean' || metricType === 'bool') {
              // Convert boolean values to 0/100 for calendar visualization
              const transformedData: CountStat[] = metric.data.map(([date, value]) => {
                const numValue = value ? 100 : 0
                return [date, numValue]
              })
              return <CalendarChart key={key} name={metric.name} data={transformedData} />
            }

            return null
          })}
        </>
      )}
    </div>
  )
}

export default Stats
