/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect, useState, useContext } from 'react'
import { Pie } from '@nivo/pie'
import { Line } from '@nivo/line'
import { Calendar } from '@nivo/calendar'
import { Choropleth } from '@nivo/geo'
import { Sunburst } from '@nivo/sunburst'
import worldFeatures from '../assets/world_countries.json'
import { RepositoryRefConfig, StatConfig, MediaDirStat, CountStat } from '@renderer/Model'
import Loader from './Loader'
import { ConfigContext } from '@renderer/ConfigContext'

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
  console.log(data); // FIXME remove
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
  if (!data || data.length === 0) return

  const chartData = [
    {
      id: slugify(name),
      data: data.map(([label, count]) => ({
        x: label,
        y: count
      }))
    }
  ]

  return (
    <div className="StatsChart">
      <h3>{name}</h3>
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
        axisTop={null}
        axisRight={null}
        axisBottom={{
          tickSize: 5,
          tickPadding: 5,
          tickRotation: 0,
          legend: 'date',
          legendOffset: 36,
          legendPosition: 'middle'
        }}
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
  if (!data || data.length === 0) return

  const chartData = data.map(([label, count]) => ({
    day: label,
    value: count
  }))

  // Find min and max years from data
  const years = chartData.map((d) => new Date(d.day).getFullYear())
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const from = `${minYear}-01-01`
  const to = `${maxYear}-12-31`

  return (
    <div className="StatsChart StatsChartWide">
      <h3>{name}</h3>
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
  const staticConfig = config.static

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

  useEffect(() => {
    const loadStatistics = async () => {
      setLoading(true)

      // Get selected repository slugs
      const selectedRepositorySlugs = staticConfig.repositories
        .filter((repository: RepositoryRefConfig) => repository.selected)
        .map((repository: RepositoryRefConfig) => repository.slug)

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

        // Load custom stats from config
        let customStatsData: Array<{ config: StatConfig; data: CountStat[] }> = []
        if (staticConfig.stats) {
          const statPromises = staticConfig.stats.map(async (statConfig) => {
            const repositories =
              statConfig.repositories.length > 0 ? statConfig.repositories : selectedRepositorySlugs

            const data = await window.api.getNoteStatistics(
              repositories,
              statConfig.query,
              statConfig.groupBy,
              statConfig.value
            )
            return {
              config: statConfig,
              data: data
            }
          })

          customStatsData = await Promise.all(statPromises)
        }

        setCustomStats(customStatsData)
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
        </>
      )}
    </div>
  )
}

export default Stats
