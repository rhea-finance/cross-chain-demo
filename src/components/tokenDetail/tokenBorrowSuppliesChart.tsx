import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { isMobileDevice } from "@/utils/common";

type chartProps = {
  data: any;
  borrowData?: any;
  yKey?: any;
  borrowYKey?: any;
  onPeriodClick?: (number) => any;
  disableControl?: boolean;
  defaultPeriod?: number;
  showPeriodTabs?: boolean;
};

const TokenBorrowSuppliesChart = ({
  data,
  borrowData,
  yKey,
  borrowYKey,
  onPeriodClick,
  disableControl,
  defaultPeriod,
  showPeriodTabs = false,
}: chartProps) => {
  const [period, setPeriod] = useState(365);
  const [init, setInit] = useState(false);
  const [showSupply, setShowSupply] = useState(true);
  const [showBorrow, setShowBorrow] = useState(true);
  const isMobile = isMobileDevice();

  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    const supplyMap = new Map();
    const borrowMap = new Map();

    data.forEach((item, index) => {
      const timestamp = item.timestamp || item.dayDate || index;
      supplyMap.set(timestamp, { ...item, index });
    });

    borrowData?.forEach((item, index) => {
      const timestamp = item.timestamp || item.dayDate || index;
      borrowMap.set(timestamp, { ...item, index });
    });

    const allTimestamps = Array.from(
      new Set([
        ...Array.from(supplyMap.keys()),
        ...Array.from(borrowMap.keys()),
      ])
    ).sort((a, b) => {
      if (typeof a === "number" && typeof b === "number") return a - b;
      if (typeof a === "string" && typeof b === "string") {
        return new Date(a).getTime() - new Date(b).getTime();
      }
      return 0;
    });

    return allTimestamps.map((timestamp, index) => {
      const supplyItem = supplyMap.get(timestamp) || {};
      const borrowItem = borrowMap.get(timestamp) || {};

      return {
        ...supplyItem,
        ...borrowItem,
        index: index,
        dayDate: supplyItem.dayDate || borrowItem.dayDate,
        [yKey]: supplyItem[yKey] || null,
        [borrowYKey]: borrowItem[borrowYKey] || null,
      };
    });
  }, [data, borrowData, yKey, borrowYKey]);

  const yAxisRange = React.useMemo(() => {
    if (!processedData || processedData.length === 0) return { min: 0, max: 3 };

    const allValues = [];

    processedData.forEach((item) => {
      if (
        showSupply &&
        item[yKey] !== null &&
        item[yKey] !== undefined &&
        !isNaN(item[yKey])
      ) {
        allValues.push(item[yKey]);
      }
      if (
        showBorrow &&
        item[borrowYKey] !== null &&
        item[borrowYKey] !== undefined &&
        !isNaN(item[borrowYKey])
      ) {
        allValues.push(item[borrowYKey]);
      }
    });

    if (allValues.length === 0) return { min: 0, max: 3 };

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    const padding = (max - min) * 0.1;
    const minWithPadding = Math.max(0, min - padding);
    const maxWithPadding = max + padding;

    return { min: minWithPadding, max: maxWithPadding };
  }, [processedData, yKey, borrowYKey, showSupply, showBorrow]);

  useEffect(() => {
    if (defaultPeriod !== undefined) {
      setPeriod(defaultPeriod);
      if (!init) {
        setInit(true);
      }
    }
  }, [defaultPeriod, init]);

  const handlePeriodClick = (n: number) => {
    if (onPeriodClick) {
      onPeriodClick(n);
    }
    setPeriod(n);
  };

  const createRenderTick = (lastDate: string, totalCount: number) => {
    if (isMobile) {
      const getVisibleIndices = () => {
        if (totalCount <= 3) {
          return Array.from({ length: totalCount }, (_, i) => i);
        }

        const visibleIndices = [0, totalCount - 1];
        const targetMiddleTicks = Math.min(
          3,
          Math.max(1, Math.floor(totalCount / 4))
        );
        if (targetMiddleTicks > 0) {
          const step = Math.floor((totalCount - 1) / (targetMiddleTicks + 1));
          for (let i = 1; i <= targetMiddleTicks; i++) {
            const idx = i * step;
            if (idx < totalCount - 2) {
              visibleIndices.push(idx);
            }
          }
        }

        return visibleIndices.sort((a, b) => a - b);
      };

      const visibleIndices = getVisibleIndices();

      const MobileRenderTick = (tickProps: any) => {
        const { x, y, payload, index } = tickProps;
        const { value } = payload;
        const isLastTick = value === lastDate;
        const shouldShow = isLastTick || visibleIndices.includes(index);

        if (shouldShow) {
          return (
            <text
              fontSize="13px"
              fill="#7E8A93"
              x={x}
              y={y + 20}
              textAnchor="middle"
            >
              {value}
            </text>
          );
        }

        return null;
      };
      MobileRenderTick.displayName = "MobileRenderTick";
      return MobileRenderTick;
    } else {
      const DesktopRenderTick = (tickProps: any) => {
        const { x, y, payload, index } = tickProps;
        const { value } = payload;
        const isLastTick = value === lastDate;
        const shouldShow = isLastTick || index % 2 === 0;

        if (shouldShow) {
          return (
            <text
              fontSize="13px"
              fill="#7E8A93"
              x={x}
              y={y + 20}
              textAnchor="middle"
            >
              {value}
            </text>
          );
        }

        return null;
      };
      DesktopRenderTick.displayName = "DesktopRenderTick";
      return DesktopRenderTick;
    }
  };

  return (
    <>
      {showPeriodTabs ? (
        <div className="flex gap-1 justify-end mb-4 text-sm">
          <TabItem
            onClick={() => handlePeriodClick(30)}
            active={period === 30}
            label="1M"
            disable={disableControl}
          />
          <TabItem
            onClick={() => handlePeriodClick(365)}
            active={period === 365}
            label="1Y"
            disable={disableControl}
          />
          <TabItem
            onClick={() => handlePeriodClick(0)}
            active={period === 0}
            label="ALL"
            disable={disableControl}
          />
        </div>
      ) : (
        <div
          className={`flex gap-1 justify-end mb-2 text-sm absolute ${
            isMobile ? "top-[-45px] right-0" : "top-[-55px] right-0"
          }`}
        >
          <TabItem
            onClick={() => handlePeriodClick(30)}
            active={period === 30}
            label="1M"
            disable={disableControl}
          />
          <TabItem
            onClick={() => handlePeriodClick(365)}
            active={period === 365}
            label="1Y"
            disable={disableControl}
          />
          <TabItem
            onClick={() => handlePeriodClick(0)}
            active={period === 0}
            label="ALL"
            disable={disableControl}
          />
        </div>
      )}

      <div className="h-[420px] max-sm:h-[300px]">
        {processedData && processedData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              width={500}
              height={450}
              data={processedData}
              margin={{
                top: isMobile ? 10 : 20,
                right: isMobile ? 20 : 0,
                left: 0,
                bottom: isMobile ? 50 : 40,
              }}
            >
              <CartesianGrid
                stroke="#e5e7eb"
                strokeWidth={1}
                opacity={0.6}
                strokeDasharray="3 3"
                vertical={false}
                horizontal={true}
              />

              <XAxis
                dataKey="dayDate"
                tickLine={false}
                axisLine={false}
                tick={createRenderTick(
                  processedData[processedData.length - 1]?.dayDate || "",
                  processedData.length
                )}
              />
              <YAxis
                tick={<RenderTickY />}
                dataKey={yKey}
                tickLine={false}
                tickCount={6}
                axisLine={false}
                orientation="left"
                domain={[yAxisRange.min, yAxisRange.max]}
                allowDataOverflow={false}
              />

              <Tooltip
                cursor={{
                  opacity: "0.3",
                  fill: "#00c6a2",
                  strokeDasharray: "2, 2",
                }}
                content={<CustomTooltip yKey={yKey} borrowYKey={borrowYKey} />}
              />

              <defs>
                <linearGradient id="colorYellow" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00F7A5" stopOpacity={0.4} />
                  <stop offset="75%" stopColor="#00F7A5" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <defs>
                <linearGradient id="colorPink" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5E3A" stopOpacity={0.4} />
                  <stop offset="75%" stopColor="#FF5E3A" stopOpacity={0.05} />
                </linearGradient>
              </defs>

              <Area
                activeDot={<ActiveDot />}
                type="monotone"
                dataKey={showSupply ? yKey : undefined}
                stroke="#00F7A5"
                fill="transparent"
                strokeWidth={1.5}
                connectNulls={true}
                dot={false}
              />

              {borrowYKey && (
                <Area
                  activeDot={<ActiveDot />}
                  type="monotone"
                  dataKey={showBorrow ? borrowYKey : undefined}
                  stroke="#FF5E3A"
                  fill="transparent"
                  strokeWidth={1.5}
                  connectNulls={true}
                  dot={false}
                />
              )}

              <Legend
                content={
                  <CustomLegend
                    showSupply={showSupply}
                    showBorrow={showBorrow}
                    onToggleSupply={() => setShowSupply(!showSupply)}
                    onToggleBorrow={() => setShowBorrow(!showBorrow)}
                  />
                }
                verticalAlign="bottom"
                height={36}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-gray-50 mb-2">No chart data available</div>
              <div className="text-sm text-gray-50">
                Data is being loaded...
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const ActiveDot = (props: any) => {
  const { cx, cy, fill } = props;
  return <circle cx={cx} cy={cy} r={4} stroke={fill} fill={fill} />;
};

const TabItem = ({ onClick, active, label, disable }: any) => {
  const handleClick = () => {
    if (!disable) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`px-2 rounded-lg cursor-pointer select-none text-black font-normal ${
        active ? "border border-gray-30" : "bg-gray-80"
      }`}
    >
      {label}
    </div>
  );
};

const RenderTickY = (tickProps: any) => {
  const { x, y, payload } = tickProps;
  const { value } = payload;

  const formatValue = (val: number) => {
    if (val >= 10) return val.toFixed(0);
    if (val >= 1) return val.toFixed(1);
    return val.toFixed(2);
  };

  return (
    <text fontSize="13px" fill="#7E8A93" x={x - 20} y={y} textAnchor="middle">
      {formatValue(value)}%
    </text>
  );
};

const CustomLegend = ({
  showSupply,
  showBorrow,
  onToggleSupply,
  onToggleBorrow,
}: any) => {
  const legendItems = [
    {
      key: "supply",
      color: "#00F7A5",
      label: "Supply Info",
      isVisible: showSupply,
      onToggle: onToggleSupply,
    },
    {
      key: "borrow",
      color: "#FF5E3A",
      label: "Borrow Info",
      isVisible: showBorrow,
      onToggle: onToggleBorrow,
    },
  ];

  return (
    <div className="flex justify-start items-center gap-6 mt-8 ml-10">
      {legendItems.map((item, index) => (
        <div
          key={item.key}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80"
          onClick={item.onToggle}
        >
          <div
            className="w-4 h-4 rounded-sm relative flex items-center justify-center"
            style={{ backgroundColor: item.color }}
          >
            {item.isVisible && (
              <svg
                width="10"
                height="8"
                viewBox="0 0 10 8"
                fill="none"
                className="text-black"
              >
                <path
                  d="M8.5 1L3.5 6L1.5 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <span className="text-sm text-black">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const CustomTooltip = ({ active, payload, yKey, borrowYKey }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const supplyData = payload.find((item: any) => item.dataKey === yKey);
  const borrowData = payload.find((item: any) => item.dataKey === borrowYKey);

  const dateInfo = supplyData?.payload || borrowData?.payload || {};
  const { dayDate } = dateInfo;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return dateStr;

    if (dateStr.startsWith("Day ")) {
      const dayNum = parseInt(dateStr.replace("Day ", ""));
      const date = new Date();
      date.setDate(date.getDate() - (365 - dayNum));
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    return dateStr;
  };

  const formatValue = (value: number) => {
    if (value === null || value === undefined || isNaN(value)) return "N/A";
    return value.toFixed(2);
  };

  return (
    <div className="px-4 py-3 rounded-lg min-w-max bg-white border border-gray-200 shadow-lg">
      <div className="text-gray-900 text-base font-medium mb-2">
        {formatDate(dayDate)}
      </div>

      <div className="space-y-1">
        {supplyData &&
          supplyData.value !== null &&
          supplyData.value !== undefined && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "#00F7A5" }}
              ></div>
              <span className="text-sm text-gray-600">Supply Info:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatValue(supplyData.value)}%
              </span>
            </div>
          )}

        {borrowData &&
          borrowData.value !== null &&
          borrowData.value !== undefined && (
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: "#FF5E3A" }}
              ></div>
              <span className="text-sm text-gray-600">Borrow Info:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatValue(borrowData.value)}%
              </span>
            </div>
          )}
      </div>
    </div>
  );
};

export default TokenBorrowSuppliesChart;
