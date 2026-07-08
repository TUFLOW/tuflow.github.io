/**
 * Network styling and interactivity for pyvis networks.
 * Configuration is passed via window.networkConfig from the HTML.
 */

function initialiseNetwork() {
  // Configuration from HTML
  const config = window.networkConfig || {};
  const netType = config.netType || 'architecture';
  const groups = config.groups || [];
  const clustered = config.clustered || false;
  const exportPositions = config.exportPositions || false;
  const positionsFilename = config.positionsFilename || 'network_positions.json';

  // Style definitions for all possible groups
  const STYLE_DEFS = {
    "architecture": {
      "Simulation Class": { color: "#E20177", shape: "circle" },
      "Model Class": { color: "#00B6DD", shape: "circle" },
      "Constituent Model": { color: "#7ED1E1", shape: "circle" },
      "Computed Variable": { color: "#B9E0F7", shape: "circle" }
    },
    "process": {
      "Source": { color: "#1ABDC9", shape: "circle" },
      "Sink": { color: "#E20177", shape: "circle" },
      "Both": { color: "#1ABDC9", border: "#E20177", shape: "circle" },
      "Computed variable": { color: "#005581", shape: "square" }
    }
  };

  const LEGEND_COLOURS = STYLE_DEFS[netType] || {};
  const GREY_NODE = { background: "#c0c0c0", border: "#9a9a9a" };
  const GREY_EDGE = "#b0b0b0";
  const DIM_NODE_OPACITY = 0.15;
  const DIM_EDGE_OPACITY = 0.15;

  function whenReady(fn) {
    // wait until pyvis has created globals
    const t0 = Date.now();
    (function poll() {
      if (window.network && window.nodes && window.edges) return fn();
      if (Date.now() - t0 > 5000) return; // give up silently after 5s
      setTimeout(poll, 25);
    })();
  }

  whenReady(function () {
    // Ensure hover events are emitted
    network.setOptions({ interaction: { hover: true, hoverConnectedEdges: false } });

    function applySavedPositions(savedPositions) {
      if (!savedPositions || typeof savedPositions !== "object") return;

      Object.entries(savedPositions).forEach(([id, pos]) => {
        if (!pos || !Number.isFinite(Number(pos.x)) || !Number.isFinite(Number(pos.y))) return;
        nodes.update({ id: id, x: Number(pos.x), y: Number(pos.y) });
        network.moveNode(id, Number(pos.x), Number(pos.y));
      });
    }

    // Cache originals
    const origNode = {};
    const origEdge = {};

    nodes.get().forEach(n => {
      origNode[n.id] = {
        color: n.color,
        opacity: (n.opacity == null ? 1.0 : n.opacity),
        label: n.label,
        group: n.group
      };
    });

    edges.get().forEach(e => {
      origEdge[e.id] = {
        color: e.color,
        opacity: (e.opacity == null ? 1.0 : e.opacity),
        width: e.width
      };
    });

    function setDimAll() {
      nodes.update(nodes.get().map(n => ({
        id: n.id,
        color: GREY_NODE,
        opacity: DIM_NODE_OPACITY
      })));

      edges.update(edges.get().map(e => ({
        id: e.id,
        color: GREY_EDGE,
        opacity: DIM_EDGE_OPACITY
      })));
    }

    function restoreAll() {
      nodes.update(nodes.get().map(n => ({
        id: n.id,
        color: origNode[n.id].color,
        opacity: origNode[n.id].opacity
      })));

      edges.update(edges.get().map(e => ({
        id: e.id,
        color: origEdge[e.id].color,
        opacity: origEdge[e.id].opacity,
        width: origEdge[e.id].width
      })));
    }

    function refreshNormalState() {
      restoreAll();
      network.redraw();
    }

    if (positionsFilename) {
      fetch(positionsFilename, { cache: "no-store" })
        .then(response => response.ok ? response.json() : null)
        .then(savedPositions => {
          applySavedPositions(savedPositions);
          refreshNormalState();
        })
        .catch(() => {});
    }

    function highlightGroup(groupName) {
      setDimAll();

      let allNodes = nodes.get();

      if (network.clustering) {
        allNodes = allNodes.flatMap(n => {
          if (network.isCluster(n.id)) {
            const contained = network.clustering.getNodesInCluster(n.id) || [];
            return contained.map(id => nodes.get(id));
          }
          return n;
        });
      }

      const keepNodes = allNodes
        .filter(n => n.group == groupName)
        .map(n => n.id);

      nodes.update(keepNodes.map(id => ({
        id,
        color: origNode[id].color,
        opacity: origNode[id].opacity
      })));
    }

    function highlightHover(nodeId) {
      setDimAll();

      const connected = network.getConnectedNodes(nodeId);
      const keepNodes = new Set([nodeId, ...connected]);

      nodes.update(Array.from(keepNodes).map(id => ({
        id,
        color: origNode[id].color,
        opacity: origNode[id].opacity
      })));

      const keepEdges = new Set();

      // all incident to hovered
      network.getConnectedEdges(nodeId).forEach(eid => keepEdges.add(eid));

      // outgoing from neighbours
      const neighbourSet = new Set(connected);
      edges.get().forEach(e => {
        if (neighbourSet.has(e.from)) keepEdges.add(e.id);
      });

      edges.update(Array.from(keepEdges).map(eid => ({
        id: eid,
        color: origEdge[eid].color,
        opacity: origEdge[eid].opacity,
        width: origEdge[eid].width
      })));
    }

    network.on("hoverNode", params => {
      const nodeGroup = origNode[params.node].group;
      if (groups.includes(nodeGroup)) {
        highlightGroup(nodeGroup);
      } else {
        highlightHover(params.node);
      }
    });
    network.on("blurNode", restoreAll);

    var container = document.getElementById("mynetwork");
    var controlPanel = document.createElement("div");

    // Create panel to hold legend and drop down
    controlPanel.style.position = "absolute";
    controlPanel.style.top = "10px";
    controlPanel.style.right = "10px";
    controlPanel.style.background = "rgba(255,255,255,0.95)";
    controlPanel.style.padding = "12px";
    controlPanel.style.borderRadius = "8px";
    controlPanel.style.boxShadow = "0 3px 10px rgba(0,0,0,0.2)";
    controlPanel.style.display = "flex";
    controlPanel.style.flexDirection = "column";
    controlPanel.style.gap = "10px";
    controlPanel.style.zIndex = 9999;

    container.appendChild(controlPanel);

    function exportNodePositions() {
      const nodeIds = nodes.getIds();
      const currentPositions = network.getPositions(nodeIds);
      const exportData = {};

      nodeIds.forEach(id => {
        const pos = currentPositions[id] || {};
        exportData[id] = {
          x: Number(pos.x),
          y: Number(pos.y)
        };
      });

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json"
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = positionsFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    if (exportPositions) {
      var exportButton = document.createElement("button");
      exportButton.type = "button";
      exportButton.textContent = "export positions";
      exportButton.style.zIndex = 9999;
      exportButton.style.padding = "6px";
      exportButton.style.fontSize = "14px";
      exportButton.style.borderRadius = "6px";
      exportButton.style.border = "1px solid #c7c7c7";
      exportButton.style.background = "#f7f7f7";
      exportButton.style.cursor = "pointer";
      exportButton.addEventListener("click", exportNodePositions);
      controlPanel.appendChild(exportButton);
    }

    // Dropdown to select specific ID
    var dropdown = document.createElement("select");
    dropdown.id = "nodeSelect";
    dropdown.style.zIndex = 9999;
    dropdown.style.padding = "6px";
    dropdown.style.fontSize = "14px";
    dropdown.style.borderRadius = "6px";

    // Set default dropdown option
    var defaultOption = document.createElement("option");
    defaultOption.text = "Select by ID";
    defaultOption.value = "";
    dropdown.appendChild(defaultOption);

    // Populate dropdown with node ids
    network.body.data.nodes.get().forEach(function(node) {
      var option = document.createElement("option");
      option.text = node.label;
      option.value = node.id;
      dropdown.appendChild(option);
    });

    controlPanel.appendChild(dropdown);

    // Legend for processes
    var legend = document.createElement("div");
    legend.id = "networkLegend";
    legend.style.zIndex = 9999;
    legend.style.display = "flex";
    legend.style.flexDirection = "column";
    legend.style.gap = "6px";
    legend.style.fontFamily = "sans-serif";

    controlPanel.appendChild(legend);

    let lockedLegend = null;
    let legendHoverEnabled = true;

    // Build legend from actual groups in network (only if not clustered)
    if (!clustered) {
      groups.forEach(groupName => {
        const groupStyle = LEGEND_COLOURS[groupName];
        if (!groupStyle) return; // Skip unknown groups

        // Create legend item container
        var item = document.createElement("div");
        item.style.display = "flex";
        item.style.alignItems = "center";
        item.style.gap = "8px";
        item.style.background = "transparent";
        item.style.color = "#333";
        item.style.fontSize = "13px";
        item.style.padding = "4px";
        item.style.cursor = "pointer";

        // Create icon for legend entry
        var icon = document.createElement("div");
        icon.style.width = "18px";
        icon.style.height = "18px";
        icon.style.background = groupStyle.color;

        if (groupStyle.shape === "square") {
          icon.style.borderRadius = "3px";
        } else {
          icon.style.borderRadius = "50%";
        }

        if (groupStyle.border) {
          icon.style.border = `3px solid ${groupStyle.border}`;
        }

        item.appendChild(icon);
        item.appendChild(document.createTextNode(groupName));

        // Hover/click handlers for legend
        function applyLegendStyle(activeItem) {
          Array.from(legend.children).forEach(el => {
            el.style.opacity = (el === activeItem) ? "1" : "0.25";
          });
        }
        function resetLegendStyle() {
          Array.from(legend.children).forEach(el => {
            el.style.opacity = "1";
          });
        }

        item.addEventListener("mouseenter", function() {
          if (!legendHoverEnabled || lockedLegend) return;
          applyLegendStyle(item);
          highlightGroup(groupName);
        });

        item.addEventListener("mouseleave", function() {
          if (!legendHoverEnabled || lockedLegend) return;
          resetLegendStyle();
          restoreAll();
        });

        item.addEventListener("click", function(e) {
          e.stopPropagation();
          lockedLegend = item;
          applyLegendStyle(item);
          highlightGroup(groupName);
        });

        legend.appendChild(item);
      });
    }

    document.addEventListener("click", function(e) {
      if (!legend.contains(e.target) && e.target !== dropdown) {
        lockedLegend = null;
        Array.from(legend.children).forEach(el => {
          el.style.opacity = "1";
        });
        restoreAll();
      }
    });

    dropdown.addEventListener("change", function() {
      var selectedNode = this.value;

      legendHoverEnabled = false;
      setTimeout(function(){
        legendHoverEnabled = true;
      }, 400);

      if (!selectedNode) {
        restoreAll();
        network.unselectAll();
        return;
      }

      let nodeToHighlight = selectedNode;

      // If node is clustered, find its cluster
      if (network.clustering && network.clustering.clusteredNodes[selectedNode]) {
        const clusterId = Object.keys(network.body.nodes).find(id => {
          if (!network.isCluster(id)) return false;
          const contained = network.clustering.getNodesInCluster(id);
          return contained.includes(selectedNode);
        });
        if (clusterId) {
          nodeToHighlight = clusterId;
        }
      }

      network.selectNodes([nodeToHighlight]);

      const nodeGroup = origNode[nodeToHighlight].group;
      if (groups.includes(nodeGroup)) {
        highlightGroup(nodeGroup);
      } else {
        highlightHover(nodeToHighlight);
      }
    });

    refreshNormalState();
    network.once("afterDrawing", refreshNormalState);
    setTimeout(refreshNormalState, 100);
    setTimeout(refreshNormalState, 500);
  });
}

// Auto-initialize on page load
document.addEventListener("DOMContentLoaded", initialiseNetwork);
