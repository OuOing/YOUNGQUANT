import * as React from "react"
import { createPortal } from "react-dom"
import { Check, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function StockCombobox({ 
  value, 
  onSelect, 
  placeholder = "搜索证券代码...", 
  suggestions = [], 
  loading = false,
  onSearchChange
}) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isFocused, setIsFocused] = React.useState(false)
  const [justSelected, setJustSelected] = React.useState(false)
  const inputRef = React.useRef(null)
  const [dropdownPos, setDropdownPos] = React.useState({ top: 0, left: 0, width: 0 })
  
  const showDropdown = (isVisible || isFocused) && !justSelected

  // 计算下拉位置
  React.useEffect(() => {
    if (showDropdown && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, left: rect.left, width: rect.width })
    }
  }, [showDropdown])

  const handleSelect = (symbol) => {
    onSelect(symbol)
    setJustSelected(true)
    setIsVisible(false)
    setIsFocused(false)
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur()
    }
  }

  const dropdown = showDropdown ? (
    <div 
      className="fixed p-0 border border-white/10 bg-[#0a0a0b]/98 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.8)] z-[99999] rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onMouseDown={(e) => e.preventDefault()} // 阻止 input blur
    >
      <Command className="bg-transparent border-none">
        <CommandList className="max-h-[320px] overflow-y-auto custom-scrollbar p-2">
          {loading && (
            <div className="px-4 py-8 text-center text-white/20 font-black italic tracking-widest animate-pulse">
              SEARCHING...
            </div>
          )}
          {!loading && (
            <>
              {suggestions.length > 0 && (
                <CommandGroup heading="匹配结果" className="text-white/20 text-[10px] font-black uppercase tracking-widest px-2 mb-2">
                  {suggestions.map((stock) => (
                    <CommandItem
                      key={stock.symbol}
                      value={stock.symbol}
                      onSelect={() => handleSelect(stock.symbol)}
                      className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/5 rounded-xl transition-all aria-selected:bg-white/5"
                    >
                      <div className="flex flex-col text-left">
                        <span className="text-sm font-black text-white">{stock.symbol}</span>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-tighter">{stock.name}</span>
                      </div>
                      {stock.has_model && (
                        <div className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(20,184,166,0.5)]" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              <CommandGroup heading="热门推荐" className="text-white/20 text-[10px] font-black uppercase tracking-widest px-2 mb-2">
                {[
                  { symbol: '600519', name: '贵州茅台' },
                  { symbol: '002594', name: '比亚迪' },
                  { symbol: '300750', name: '宁德时代' },
                  { symbol: '601318', name: '中国平安' },
                  { symbol: '000333', name: '美的集团' },
                  { symbol: '000651', name: '格力电器' },
                  { symbol: '600036', name: '招商银行' },
                  { symbol: '601899', name: '紫金矿业' },
                  { symbol: '000001', name: '平安银行' },
                  { symbol: '002415', name: '海康威视' },
                  { symbol: '300059', name: '东方财富' },
                  { symbol: '600900', name: '长江电力' },
                  { symbol: '601088', name: '中国神华' },
                  { symbol: '000858', name: '五粮液' },
                  { symbol: '600276', name: '恒瑞医药' },
                  { symbol: '688981', name: '中芯国际' },
                  { symbol: '601012', name: '隆基绿能' },
                  { symbol: '600887', name: '伊利股份' },
                  { symbol: '002352', name: '顺丰控股' },
                  { symbol: '600941', name: '中国移动' },
                ].filter(s => s.symbol !== value).map((stock) => (
                  <CommandItem
                    key={stock.symbol}
                    value={stock.symbol}
                    onSelect={() => handleSelect(stock.symbol)}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-white/10 rounded-xl transition-all aria-selected:bg-white/5"
                  >
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-black text-white/60">{stock.symbol}</span>
                      <span className="text-[10px] font-bold text-white/20 uppercase tracking-tighter">{stock.name}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </Command>
    </div>
  ) : null

  return (
    <div 
      className="relative w-full"
      onMouseEnter={() => { setJustSelected(false); setIsVisible(true) }}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="relative w-full group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-secondary transition-colors z-10">
          <Search size={16} />
        </div>
        <input
          ref={inputRef}
          type="text"
          className="w-full bg-black/40 border border-white/5 rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-white outline-none focus:border-secondary/30 transition-all shadow-inner placeholder:text-white/10"
          placeholder={placeholder}
          value={value}
          onChange={(e) => { setJustSelected(false); onSearchChange?.(e.target.value) }}
          onFocus={() => { setJustSelected(false); setIsFocused(true) }}
          onBlur={() => setIsFocused(false)}
        />
      </div>
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  )
}
