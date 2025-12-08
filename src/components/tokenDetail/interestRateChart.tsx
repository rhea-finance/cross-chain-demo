import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { isMobileDevice } from "@/utils/common";

const InterestRateChart = ({ data }: any) => {
  const { currentUtilRate } = data?.[0] || [];
  const isMobile = isMobileDevice();
  const currentData = data?.find(
    (d) => d.percent === Math.round(currentUtilRate)
  );
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        width={500}
        height={300}
        data={data}
        margin={{
          top: 20,
          right: isMobile ? 16 : 50,
          left: isMobile ? 0 : 20,
          bottom: 5,
        }}
      >
        <XAxis
          type="number"
          dataKey="percent"
          tickLine={false}
          axisLine={false}
          tick={<RenderTick />}
        />
        <YAxis
          tick={<RenderTickY />}
          tickLine={false}
          tickCount={6}
          axisLine={false}
          orientation="left"
        />

        <Tooltip
          wrapperStyle={{ visibility: currentData ? "visible" : "hidden" }}
          cursor={{
            opacity: "0.3",
            fill: "transparent",
            strokeDasharray: "2, 2",
          }}
          content={
            <CustomTooltip
              defaultPayload={isMobile && [{ payload: currentData }]}
            />
          }
        />

        <CartesianGrid
          stroke="#e5e7eb"
          strokeWidth={1}
          opacity={0.6}
          strokeDasharray="3 3"
          vertical={false}
          horizontal={true}
        />

        {isMobile && (
          <ReferenceLine
            type="number"
            x={currentUtilRate}
            stroke="#C0C4E9"
            opacity={0.3}
          />
        )}
        {!isMobile && (
          <ReferenceLine
            type="number"
            x={currentUtilRate}
            stroke="#C0C4E9"
            label={<CustomLabel value={currentUtilRate} />}
          />
        )}

        <Line
          type="monotone"
          dataKey="borrowRate"
          stroke="#FF5E3A"
          dot={null}
          activeDot={<ActiveDot />}
        />
        <Line
          type="monotone"
          dataKey="supplyRate"
          stroke="#00F7A5"
          dot={null}
          activeDot={<ActiveDot />}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
const ActiveDot = (props: any) => {
  const { cx, cy, stroke, fill, payload, value } = props;
  return <circle cx={cx} cy={cy} r={4} stroke={fill} fill={fill} />;
};

const CustomTooltip = ({ active, payload, defaultPayload }: any) => {
  const payload2 = payload?.length ? payload : defaultPayload;
  const data = payload2?.[0] || {};
  const { value } = data || {};
  const { percent, borrowRate, supplyRate } = data?.payload || {};

  if (!defaultPayload && (!active || !payload2 || !payload2?.[0])) return null;
  return (
    <div
      className="px-3 py-2 rounded-md min-w-max"
      style={{ backgroundColor: "#FFFFFF", border: "1px solid #E5E7EB" }}
    >
      <LabelText
        left="Utilization Rate"
        right={`${percent?.toFixed(2)}%`}
        style={{ color: "#000000" }}
      />
      <LabelText
        left="Borrow Rate"
        right={`${borrowRate?.toFixed(2)}%`}
        style={{ color: "#FF5E3A" }}
      />
      <LabelText
        left="Supply Rate"
        right={`${supplyRate?.toFixed(2)}%`}
        style={{ color: "#00F7A5" }}
        className="mb-0"
      />
    </div>
  );
};

export const LabelText = ({
  left,
  leftIcon,
  right,
  style,
  className = "",
}: any) => {
  return (
    <div
      className={`text-black text-sm mb-1 flex justify-between ${className}`}
      style={style}
    >
      <div className="flex items-center mr-1">
        {leftIcon}
        {left}
      </div>
      <div>{right}</div>
    </div>
  );
};

const RenderTickY = (tickProps: any) => {
  const { x, y, payload, index } = tickProps;
  const { value, offset } = payload;

  return (
    <text fontSize="13px" fill="#7E8A93" x={x - 20} y={y} textAnchor="middle">
      {value}%
    </text>
  );
};

const RenderTick = (tickProps: any) => {
  const { x, y, payload, index } = tickProps;
  const { value, offset } = payload;

  return (
    <text fontSize="13px" fill="#7E8A93" x={x} y={y + 20} textAnchor="middle">
      {value}%
    </text>
  );
};

const CustomLabel = (props: any) => {
  const { viewBox, value } = props || {};
  const { x, y } = viewBox || {};

  const WIDTH = 153;
  return (
    <g>
      <rect
        x={x - WIDTH / 2}
        y={y}
        fill="#FFFFFF"
        width={WIDTH}
        height={30}
        rx={6}
        ry={6}
        stroke="#E5E7EB"
        strokeWidth={1}
      />
      <text x={x - WIDTH / 2} y={y} fill="#8A8A8D" dy={19} dx={9} fontSize={11}>
        Current Utilization {value?.toFixed(2)}%
      </text>
    </g>
  );
};

export default InterestRateChart;
