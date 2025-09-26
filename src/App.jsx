import { useMemo, useState, useCallback } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from "recharts";
const HelpTooltip = ({ id, text }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-block ml-2">
      <button
        type="button"
        className="w-4 h-4 rounded-full bg-gray-200 text-gray-700 text-xs font-bold 
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-describedby={visible ? `${id}-help` : undefined}
        aria-label="More information"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onFocus={() => setVisible(true)}
        onBlur={() => setVisible(false)}
      >
        ?
      </button>
      {visible && (
        <span
          id={`${id}-help`}
          role="tooltip"
          className="absolute left-6 top-0 z-10 w-64 p-2 text-xs text-white bg-gray-800 rounded shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
};



// Custom label component for bars (exchange rates)
function CustomBarLabel(props) {
  const { x, y, width, height, value } = props;
  
  if (!value || Math.abs(value) < 0.0001) return null;
  
  return (
    <text
      x={x + width / 2}
      y={y - 8}
      textAnchor="middle"
      fill="#000"
      fontSize="11"
      fontWeight="bold"
    >
      {value.toFixed(4)}
    </text>
  );
}

// Shared Components
function Card({ title, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl shadow-md p-5 border border-gray-100 ${className}`}>
      <h2 className="font-serif text-xl text-slate-800 mb-3">{title}</h2>
      <div className="font-sans text-sm text-black/80">{children}</div>
    </div>
  );
}

function FormField({ id, label, children, error, helpText, required = false }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={id} className="font-medium text-gray-700 mb-1 flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        {helpText && <HelpTooltip id={id} text={helpText} />}
      </label>
      {children}
      {error && (
        <div className="text-red-600 text-xs mt-1" role="alert" id={`${id}-error`}>
          {error}
        </div>
      )}
    </div>
  );
}


function ValidationMessage({ errors }) {
  if (!errors || Object.keys(errors).length === 0) return null;
  
  return (
    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg" role="alert">
      <h3 className="text-red-800 font-semibold text-sm mb-2">Please correct the following:</h3>
      <ul className="text-red-800 text-sm space-y-1">
        {Object.entries(errors).map(([field, error]) => (
          <li key={field}>• {error}</li>
        ))}
      </ul>
    </div>
  );
}

function ResultCard({ title, value, subtitle, description, isValid = true }) {
  if (!isValid) return null;
  
  return (
    <div className="mb-6 p-4 bg-blue-50 rounded-lg">
      <div className="text-3xl font-serif text-blue-600 mb-2">{value}</div>
      <div className="text-sm text-gray-700">
        <div><strong>{title}</strong> - {subtitle}</div>
        <div className="mt-1">{description}</div>
      </div>
    </div>
  );
}

function calculateForwardExchangeRate({ spotRate, domesticRate, foreignRate }) {
  const r_d = domesticRate / 100;
  const r_f = foreignRate / 100;
  const initialInvestment = 1000;
  
  // Calculate implied forward exchange rate using covered interest rate parity with continuous compounding
  // F = S × e^(r_f - r_d)
  const forwardRate = spotRate * Math.exp(r_f - r_d);
  
  // Strategy 1: Domestic investment
  const domesticEndingValue = initialInvestment * (1 + r_d);
  
  // Strategy 2: Foreign investment (should equal domestic under no-arbitrage)
  const foreignCurrencyAmount = initialInvestment * spotRate;
  const foreignEndingValue = foreignCurrencyAmount * (1 + r_f);
  const domesticEquivalent = foreignEndingValue / forwardRate;
  
  // Verify no arbitrage (should be equal)
  const arbitrageDiff = Math.abs(domesticEndingValue - domesticEquivalent);
  const noArbitrage = arbitrageDiff < 0.01;
  
  // Create chart data - ensure interest rates are numbers
  const chartData = [
    {
      name: "t = 0",
      exchangeRate: spotRate,
      domesticRate: domesticRate, // Keep as percentage for display
      foreignRate: foreignRate,   // Keep as percentage for display
      type: "Spot Rate"
    },
    {
      name: "t = 1", 
      exchangeRate: forwardRate,
      domesticRate: domesticRate, // Same rates at both times
      foreignRate: foreignRate,   // Same rates at both times
      type: "Forward Rate"
    }
  ];
  
  return {
    forwardRate,
    domesticEndingValue,
    foreignEndingValue,
    domesticEquivalent,
    arbitrageDiff,
    noArbitrage,
    chartData,
    isValid: spotRate > 0 && r_d > -1 && r_f > -1
  };
}

export default function ForwardExchangeRatesCalculator() {
  const [inputs, setInputs] = useState({ 
    spotRate: 1.2602,
    domesticRate: 2.360,
    foreignRate: 2.430
  });
  
  // Custom label function with access to inputs - defined inside component
  const CustomLineLabel = useCallback((props) => {
    const { x, y, value, index } = props;
    
    if (!value || index !== 0) return null; // Show on first data point but offset to center
    
    // Handle edge case where rates are equal
    if (Math.abs(inputs.domesticRate - inputs.foreignRate) < 0.01) {
      // When rates are equal, show a single combined label
      return (
        <text
          x={x + 100}
          y={y}
          textAnchor="middle"
          fill="#000"
          fontSize="11"
          fontWeight="bold"
        >
          Interest Rate: {value.toFixed(3)}%
        </text>
      );
    }
    
    // Compare against actual input values to determine which line is which
    const isDomestic = Math.abs(value - inputs.domesticRate) < 0.01;
    const isForeign = Math.abs(value - inputs.foreignRate) < 0.01;
    
    if (!isDomestic && !isForeign) return null; // Safety check
    
    const centerX = x + 100; // Offset towards center between bars
    const labelY = isDomestic ? y + 35 : y - 25; // Domestic below its line, foreign above its line
    const lineColor = isDomestic ? '#7c3aed' : '#ea580c'; // Match line colors
    
    return (
      <g>
        {/* Leader line from label to data point */}
        <line
          x1={centerX}
          y1={labelY + (isDomestic ? -8 : 8)} // Start just above/below text
          x2={x}
          y2={y}
          stroke={lineColor}
          strokeWidth={1}
          opacity={0.7}
          strokeDasharray="2,2"
        />
        
        {/* Label text */}
        <text
          x={centerX}
          y={labelY}
          textAnchor="middle"
          fill="#000"
          fontSize="11"
          fontWeight="bold"
        >
          {isDomestic ? 'Domestic' : 'Foreign'}: {value.toFixed(3)}%
        </text>
      </g>
    );
  }, [inputs.domesticRate, inputs.foreignRate]);
  
  const validateInputs = useCallback((inputs) => {
    const errors = {};
    
    if (!inputs.spotRate || inputs.spotRate <= 0) {
      errors.spotRate = "Spot exchange rate must be positive";
    } else if (inputs.spotRate > 10) {
      errors.spotRate = "Spot exchange rate seems unrealistically high";
    }
    
    if (inputs.domesticRate <= -100) {
      errors.domesticRate = "Domestic interest rate must be greater than -100%";
    } else if (inputs.domesticRate > 50) {
      errors.domesticRate = "Domestic interest rate cannot exceed 50%";
    }
    
    if (inputs.foreignRate <= -100) {
      errors.foreignRate = "Foreign interest rate must be greater than -100%";
    } else if (inputs.foreignRate > 50) {
      errors.foreignRate = "Foreign interest rate cannot exceed 50%";
    }
    
    return errors;
  }, []);
  
  const handleInputChange = useCallback((field, value) => {
    setInputs(prev => ({ ...prev, [field]: +value }));
  }, []);
  
  const handleInputFocus = useCallback((event) => {
    event.target.select();
  }, []);
  
  const inputErrors = validateInputs(inputs);
  const model = useMemo(() => {
    if (Object.keys(inputErrors).length > 0) return null;
    return calculateForwardExchangeRate(inputs);
  }, [inputs, inputErrors]);

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-7xl mx-auto px-4 py-6">

        <Card title="Forward Exchange Rate Calculator">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <FormField 
              id="spot-rate" 
              label="Spot Exchange Rate" 
              helpText="Units of foreign currency per 1 domestic"
              error={inputErrors.spotRate}
              required
            >
              <input
                id="spot-rate"
                type="number"
                step="0.0001"
                min="0.0001"
                max="10"
                value={inputs.spotRate}
                onChange={(e) => handleInputChange('spotRate', e.target.value)}
                onFocus={handleInputFocus}
                className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby={inputErrors.spotRate ? "spot-rate-error" : undefined}
                aria-invalid={inputErrors.spotRate ? 'true' : 'false'}
              />
            </FormField>

            <FormField 
              id="domestic-rate" 
              label="Domestic Interest Rate (%)" 
              helpText="Annual rate for domestic currency"
              error={inputErrors.domesticRate}
              required
            >
              <input
                id="domestic-rate"
                type="number"
                step="0.001"
                min="-99"
                max="50"
                value={inputs.domesticRate}
                onChange={(e) => handleInputChange('domesticRate', e.target.value)}
                onFocus={handleInputFocus}
                className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby={inputErrors.domesticRate ? "domestic-rate-error" : undefined}
                aria-invalid={inputErrors.domesticRate ? 'true' : 'false'}
              />
            </FormField>

            <FormField 
              id="foreign-rate" 
              label="Foreign Interest Rate (%)" 
              helpText="Annual rate for foreign currency"
              error={inputErrors.foreignRate}
              required
            >
              <input
                id="foreign-rate"
                type="number"
                step="0.001"
                min="-99"
                max="50"
                value={inputs.foreignRate}
                onChange={(e) => handleInputChange('foreignRate', e.target.value)}
                onFocus={handleInputFocus}
                className="mt-1 rounded-lg border px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby={inputErrors.foreignRate ? "foreign-rate-error" : undefined}
                aria-invalid={inputErrors.foreignRate ? 'true' : 'false'}
              />
            </FormField>
          </div>

          <ValidationMessage errors={inputErrors} />

          {model && model.isValid && (
            <>
              <ResultCard
                title="Implied Forward Exchange Rate"
                value={model.forwardRate.toFixed(4)}
                subtitle="the no-arbitrage forward rate using continuous compounding"
                description={
                  <div>
                    <div className="mb-1">Using Covered Interest Rate Parity:</div>
                    <div className="font-mono text-base bg-white px-2 py-1 rounded border">
                      F = S × e<sup>(r<sub>foreign</sub> - r<sub>domestic</sub>)</sup>
                    </div>
                  </div>
                }
                isValid={model.isValid}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-green-50 rounded-lg">
                  <div className="font-medium text-green-800">Domestic Investment Strategy</div>
                  <div className="text-sm text-green-700 mt-1">
                    Invest $1,000 at {inputs.domesticRate.toFixed(3)}% domestic rate<br/>
                    Final value: ${model.domesticEndingValue.toFixed(2)}
                  </div>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg">
                  <div className="font-medium text-purple-800">Foreign Investment Strategy</div>
                  <div className="text-sm text-purple-700 mt-1">
                    Convert → invest at {inputs.foreignRate.toFixed(3)}% → convert back<br/>
                    Final value: ${model.domesticEquivalent.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Screen reader accessible data table */}
              <div className="sr-only">
                <h3 id="chart-title">Exchange Rate and Interest Rate Data</h3>
                <p id="chart-description">
                  Comparison of spot exchange rate at time 0 ({inputs.spotRate.toFixed(4)}) 
                  versus forward exchange rate at time 1 ({model.forwardRate.toFixed(4)}), 
                  alongside domestic interest rate ({inputs.domesticRate.toFixed(3)}%) and 
                  foreign interest rate ({inputs.foreignRate.toFixed(3)}%).
                  {model.forwardRate > inputs.spotRate 
                    ? ' The forward rate is higher, indicating the foreign currency is expected to strengthen.'
                    : ' The forward rate is lower, indicating the foreign currency is expected to weaken.'}
                  The interest rate differential of {(inputs.foreignRate - inputs.domesticRate).toFixed(3)} 
                  percentage points drives this forward rate calculation.
                </p>
                <table>
                  <caption>Exchange rates and interest rates comparison over time</caption>
                  <thead>
                    <tr>
                      <th scope="col">Time Period</th>
                      <th scope="col" className="text-right">Exchange Rate</th>
                      <th scope="col" className="text-right">Domestic Rate (%)</th>
                      <th scope="col" className="text-right">Foreign Rate (%)</th>
                      <th scope="col">Rate Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {model.chartData.map(row => (
                      <tr key={row.name}>
                        <th scope="row">{row.name}</th>
                        <td className="text-right">{row.exchangeRate.toFixed(4)}</td>
                        <td className="text-right">{row.domesticRate.toFixed(3)}%</td>
                        <td className="text-right">{row.foreignRate.toFixed(3)}%</td>
                        <td>{row.type}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Custom Legend with clear rate type distinctions */}
              <div className="mb-2 text-center">
                <span className="text-black font-medium">Exchange Rates: </span>
                <span className="font-semibold text-green-600">
                  Spot {inputs.spotRate.toFixed(4)}
                </span>
                <span className="text-black mx-2">, </span>
                <span className="font-semibold text-blue-600">
                  Forward {model.forwardRate.toFixed(4)}
                </span>
              </div>

              {/* Interest Rate Legend - positioned right below custom legend */}
              <div className="mb-4 text-center text-sm">
                <span className="text-black font-medium">Interest Rates: </span>
                <span className="font-semibold text-purple-600 mr-4">
                  Domestic {inputs.domesticRate.toFixed(3)}%
                </span>
                <span className="font-semibold text-orange-600">
                  Foreign {inputs.foreignRate.toFixed(3)}%
                </span>
              </div>

              {/* Chart container with proper ARIA labeling */}
              <div className="h-96" 
                   role="img" 
                   aria-labelledby="chart-title" 
                   aria-describedby="chart-description">
                <div className="text-center text-sm text-gray-600 mb-2 font-medium">
                  Forward Exchange Rate Calculation with Interest Rate Differential Analysis
                </div>
                
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={model.chartData}
                    margin={{ top: 40, right: 120, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      label={{ value: 'Time Periods', position: 'insideBottom', offset: -10 }}
                    />
                    <YAxis 
                      yAxisId="left"
                      label={{ value: 'Exchange Rate', angle: -90, position: 'insideLeft' }}
                      domain={[0, 2.0]}
                      tickCount={6}
                      tickFormatter={(value) => value.toFixed(1)}
                    />
                    <YAxis 
                      yAxisId="right"
                      orientation="right"
                      label={{ value: 'Interest Rate (%)', angle: 90, position: 'insideRight' }}
                      domain={[2.0, 2.8]}
                      tickCount={5}
                      tickFormatter={(value) => `${value.toFixed(2)}`}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'Exchange Rate') return [value.toFixed(4), name];
                        if (name.includes('Rate')) return [`${value.toFixed(3)}%`, name];
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Time: ${label}`}
                    />
                    
                    {/* No legend in chart - we have custom legends above */}
                    
                    <Bar 
                      yAxisId="left"
                      dataKey="exchangeRate" 
                      fill="#2563eb"
                      barSize={60}
                      label={<CustomBarLabel />}
                    >
                      <Cell fill="#059669" />  {/* Green for spot */}
                      <Cell fill="#2563eb" />  {/* Blue for forward */}
                    </Bar>
                    
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="domesticRate" 
                      stroke="#7c3aed" 
                      strokeWidth={4}
                      dot={{ fill: '#7c3aed', strokeWidth: 2, r: 6 }}
                      label={<CustomLineLabel />}
                      connectNulls={false}
                    />
                    
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="foreignRate" 
                      stroke="#ea580c" 
                      strokeWidth={4}
                      dot={{ fill: '#ea580c', strokeWidth: 2, r: 6 }}
                      label={<CustomLineLabel />}
                      connectNulls={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                <strong>Covered Interest Rate Parity (Continuous Compounding):</strong> The forward exchange rate ({model.forwardRate.toFixed(4)}) 
                is calculated using the interest rate differential between the foreign currency ({inputs.foreignRate.toFixed(3)}%) and 
                domestic currency ({inputs.domesticRate.toFixed(3)}%) markets. The formula assumes continuous compounding and prevents arbitrage opportunities 
                by ensuring both investment strategies yield identical returns when currency risk is hedged.
              </div>
            </>
          )}
        </Card>
      </main>
    </div>
  );
}