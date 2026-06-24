// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { Mermaid } from "../components/Mermaid"
import mermaid from "mermaid"

// Mock mermaid library
vi.mock("mermaid", () => {
  return {
    default: {
      initialize: vi.fn(),
      render: vi.fn().mockImplementation((id, chart) => {
        if (chart.includes("INVALID")) {
          return Promise.reject(new Error("Mocked Syntax Error"))
        }
        return Promise.resolve({ svg: "<svg>Mocked SVG</svg>" })
      }),
    },
  }
})

describe("Mermaid component", () => {
  it("renders the mocked mermaid svg", async () => {
    render(<Mermaid chart="graph TD; A-->B;" isDark={false} />)
    
    // The component initially shows loading state
    const loadingText = screen.getByText("正在渲染图表...")
    expect(loadingText).toBeDefined()
    
    // Wait for the async render operation to complete and display the SVG
    const renderedSvg = await screen.findByText("Mocked SVG")
    expect(renderedSvg).toBeDefined()
  })

  it("handles rendering errors gracefully", async () => {
    render(<Mermaid chart="INVALID SYNTAX" isDark={false} />)
    
    // Wait for error state to be displayed
    const errorTitle = await screen.findByText("Mermaid 渲染错误:")
    expect(errorTitle).toBeDefined()
    
    const errorDetails = screen.getByText("Mocked Syntax Error")
    expect(errorDetails).toBeDefined()
  })

  it("initializes with correct dark/light themes", async () => {
    const { rerender } = render(<Mermaid chart="graph TD; A-->B;" isDark={false} />)
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "default" })
    )

    rerender(<Mermaid chart="graph TD; A-->B;" isDark={true} />)
    expect(mermaid.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ theme: "dark" })
    )
  })
})
