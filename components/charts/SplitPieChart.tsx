"use client"

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts"

interface SplitData {
  name: string
  value: number
  color: string
}

interface SplitPieChartProps {
  songCollaborators: Array<{
    id: string
    collaborator: {
      firstName?: string
      middleName?: string | null
      lastName?: string
    }
    roleInSong: string
    publishingOwnership: number | null
    masterOwnership: number | null
  }>
  songPublishingEntities?: Array<{
    id: string
    publishingEntity: {
      name: string
    }
    ownershipPercentage: number | null
  }>
  labelMasterShare?: number | null
}

const PUBLISHING_COLORS = [
  "#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#8dd1e1", "#d084d0", "#ffb347", "#87ceeb"
]

const MASTER_COLORS = [
  "#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#ffeaa7", "#dda0dd", "#98d8c8", "#f7dc6f"
]

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="bg-white p-2 border rounded shadow-lg">
        <p className="font-medium">{data.name}</p>
        <p className="text-sm">{data.value.toFixed(2)}%</p>
      </div>
    )
  }
  return null
}

export function SplitPieChart({
  songCollaborators,
  songPublishingEntities = [],
  labelMasterShare = null
}: SplitPieChartProps) {
  // Prepare publishing splits data (Writer's Share - totals 50%)
  const publishingSplits: SplitData[] = []
  
  // Add collaborator publishing splits
  songCollaborators.forEach((sc, index) => {
    const publishing = sc.publishingOwnership ?? 0
    // publishingOwnership is already in percentage format (0-100) from fetchSong
    const publishingPercent = Number(publishing)
    if (publishingPercent > 0) {
      const fullName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName]
        .filter(Boolean)
        .join(" ")
      const roleLabel = sc.roleInSong === "writer" ? "Writer" : 
                       sc.roleInSong === "artist" ? "Artist" :
                       sc.roleInSong === "label" ? "Label" : sc.roleInSong
      publishingSplits.push({
        name: `${fullName} (${roleLabel})`,
        value: publishingPercent,
        color: PUBLISHING_COLORS[publishingSplits.length % PUBLISHING_COLORS.length]
      })
    }
  })

  // Add publishing entity splits
  songPublishingEntities.forEach((spe) => {
    const percentage = spe.ownershipPercentage ?? 0
    // ownershipPercentage is already in percentage format (0-100) from fetchSong
    const percentagePercent = Number(percentage)
    if (percentagePercent > 0) {
      publishingSplits.push({
        name: spe.publishingEntity.name,
        value: percentagePercent,
        color: PUBLISHING_COLORS[publishingSplits.length % PUBLISHING_COLORS.length]
      })
    }
  })

  // Prepare master splits data (totals 50%)
  const masterSplits: SplitData[] = []
  
  // Add collaborator master splits
  songCollaborators.forEach((sc) => {
    const master = sc.masterOwnership ?? 0
    // masterOwnership is already in percentage format (0-100) from fetchSong
    const masterPercent = Number(master)
    if (masterPercent > 0) {
      const fullName = [sc.collaborator.firstName, sc.collaborator.middleName, sc.collaborator.lastName]
        .filter(Boolean)
        .join(" ")
      const roleLabel = sc.roleInSong === "producer" ? "Producer" : 
                       sc.roleInSong === "musician" ? "Musician" :
                       sc.roleInSong === "artist" ? "Artist" :
                       sc.roleInSong === "vocalist" ? "Vocalist" :
                       sc.roleInSong === "label" ? "Label" : sc.roleInSong
      masterSplits.push({
        name: `${fullName} (${roleLabel})`,
        value: masterPercent,
        color: MASTER_COLORS[masterSplits.length % MASTER_COLORS.length]
      })
    }
  })

  // Add label master share
  if (labelMasterShare && labelMasterShare > 0) {
    // labelMasterShare is already in percentage format (0-100) from fetchSong
    const labelSharePercent = Number(labelMasterShare)
    if (labelSharePercent > 0) {
      masterSplits.push({
        name: "River & Ember (Label)",
        value: labelSharePercent,
        color: MASTER_COLORS[masterSplits.length % MASTER_COLORS.length]
      })
    }
  }

  // Sort splits by value (largest to smallest) for both pie chart and legend
  publishingSplits.sort((a, b) => b.value - a.value)
  masterSplits.sort((a, b) => b.value - a.value)

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Publishing Pie Chart */}
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold mb-1 text-center">Publishing Splits</h3>
          <div className="flex flex-col" style={{ minHeight: '300px' }}>
            {publishingSplits.length > 0 ? (
              <>
                <div className="flex items-center justify-center" style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={publishingSplits}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {publishingSplits.map((entry, index) => (
                          <Cell 
                            key={`publishing-${index}`} 
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {publishingSplits.map((entry, index) => (
                    <div key={`legend-publishing-${index}`} className="flex items-center gap-2 text-sm">
                      <span 
                        className="w-4 h-4 rounded flex-shrink-0" 
                        style={{ backgroundColor: entry.color }}
                      ></span>
                      <span>{entry.name}: {entry.value.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No publishing splits
              </div>
            )}
          </div>
        </div>

        {/* Master Pie Chart */}
        <div className="flex flex-col">
          <h3 className="text-lg font-semibold mb-1 text-center">Master Splits</h3>
          <div className="flex flex-col" style={{ minHeight: '300px' }}>
            {masterSplits.length > 0 ? (
              <>
                <div className="flex items-center justify-center" style={{ height: '300px' }}>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={masterSplits}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={90}
                        fill="#ff6b6b"
                        dataKey="value"
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                      >
                        {masterSplits.map((entry, index) => (
                          <Cell 
                            key={`master-${index}`} 
                            fill={entry.color}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-4 space-y-2">
                  {masterSplits.map((entry, index) => (
                    <div key={`legend-master-${index}`} className="flex items-center gap-2 text-sm">
                      <span 
                        className="w-4 h-4 rounded flex-shrink-0" 
                        style={{ backgroundColor: entry.color }}
                      ></span>
                      <span>{entry.name}: {entry.value.toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No master splits
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
