/**
 * Clustered network styling for pyvis networks.
 * Configuration is passed via window.networkConfig from the HTML.
 */

(function () {
  const config = window.networkConfig || {};
  const netType = config.netType || 'architecture';
  const groups = config.groups || [];

  // Style definitions for all possible groups
  const STYLE_DEFS = {
    "architecture": {
      "Simulation Class": { color: "#E20177", size: 20 },
      "Model Class": { color: "#00B6DD", size: 35 },
      "Constituent Model": { color: "#7ED1E1", size: 55 },
      "Computed Variable": { color: "#B9E0F7", size: 25 }
    }
  };

  const GROUP_COLOURS = {};
  const GROUP_SIZES = {};

  // Build colour and size maps from actual groups
  const styleDef = STYLE_DEFS[netType] || {};
  groups.forEach(group => {
    if (styleDef[group]) {
      GROUP_COLOURS[group] = styleDef[group].color;
      GROUP_SIZES[group] = styleDef[group].size;
    }
  });

  function whenReady(fn) {
    const t0 = Date.now();
    (function poll() {
      if (window.network && window.nodes && window.edges) return fn();
      if (Date.now() - t0 > 5000) return;
      setTimeout(poll, 25);
    })();
  }

  whenReady(function () {
    // Cache DataSet positions before clustering hides nodes (works in file:// context, no fetch needed)
    const nodeDefaultPositions = {};
    nodes.get().forEach(function(n) {
      if (Number.isFinite(n.x) && Number.isFinite(n.y)) {
        nodeDefaultPositions[n.id] = { x: n.x, y: n.y };
      }
      n.originalGroup = n.group;
    });

    function clusterByGroup(groupName) {
      const groupNodes = nodes.get({
        filter: n => n.originalGroup === groupName
      });

      if (groupNodes.length === 0) return;

      network.cluster({
        joinCondition: function (nodeOptions) {
          return nodeOptions.group === groupName;
        },

        clusterNodeProperties: {
          id: "cluster_" + groupName.replace(/\s+/g, "_"),
          label: "Cluster on group: " + groupName,
          shape: "dot",
          size: GROUP_SIZES[groupName],
          color: {
            background: GROUP_COLOURS[groupName],
          },
          x: 0,
          y: -650 + GROUP_SIZES[groupName] * 15,
          fixed: {"x": true, "y": true},
          font: {
            size: 16,
            color: "#000000",
            vadjust: 1,  // puts label below circle
            strokeWidth: 10,
            strokeColor: "#ffffff"
          },
          allowSingleNodeCluster: false
        }
      });
    }

    // Run clustering after first render
    network.once("afterDrawing", function () {
      Object.keys(GROUP_COLOURS).forEach(function (group) {
        clusterByGroup(group);
      });
    });

    function recluster() {
      // Open all existing clusters first, then re-cluster
      Object.keys(network.body.nodes).forEach(function(id) {
        if (network.isCluster(id)) {
          network.openCluster(id);
        }
      });
      Object.keys(GROUP_COLOURS).forEach(function(group) {
        clusterByGroup(group);
      });
      if (typeof window.restoreAll === "function") {
        window.restoreAll();
      }
    }

    function applyExplodePositions() {
      // Use explicitly fetched positions if available, otherwise fall back to DataSet positions
      // cached before clustering (these are the same values Python baked into the HTML)
      const positions = (window.savedNodePositions && Object.keys(window.savedNodePositions).length > 0)
        ? window.savedNodePositions
        : nodeDefaultPositions;
      if (!positions || typeof positions !== "object" || Object.keys(positions).length === 0) return;

      const pinnedIds = [];
      Object.entries(positions).forEach(function([id, pos]) {
        if (pos && Number.isFinite(Number(pos.x)) && Number.isFinite(Number(pos.y))) {
          // Pin node at saved position so physics cannot override it
          nodes.update({ id: id, x: Number(pos.x), y: Number(pos.y), fixed: { x: true, y: true } });
          network.moveNode(id, Number(pos.x), Number(pos.y));
          pinnedIds.push(id);
        }
      });

      // Release pin after physics has settled so nodes remain draggable
      setTimeout(function() {
        pinnedIds.forEach(function(id) {
          nodes.update({ id: id, fixed: { x: false, y: false } });
        });
      }, 500);
    }

    function findClusterContaining(nodeId) {
      const allIds = Object.keys(network.body.nodes);
      for (const id of allIds) {
        if (network.isCluster(id)) {
          const contained = network.getNodesInCluster(id);
          if (contained.includes(nodeId)) return id;
        }
      }
      return null;
    }

    // Double-click to open a cluster
    network.on("doubleClick", function(params) {
      if (params.nodes.length === 1 && network.isCluster(params.nodes[0])) {
        network.openCluster(params.nodes[0]);
        setTimeout(function() {
          applyExplodePositions();
          if (typeof window.restoreAll === "function") {
            window.restoreAll();
          }
        }, 50);
      }
    });

    // Expose for dropdown integration in network_styling.js
    window.openClusterAndHighlight = function(nodeId) {
      const clusterNode = findClusterContaining(nodeId);
      if (clusterNode) {
        network.openCluster(clusterNode);
        setTimeout(function() {
          applyExplodePositions();
          network.selectNodes([nodeId]);
          if (typeof window.highlightHover === "function") {
            window.highlightHover(nodeId);
          }
        }, 50);
      } else {
        network.selectNodes([nodeId]);
        if (typeof window.highlightHover === "function") {
          window.highlightHover(nodeId);
        }
      }
    };

    // Re-initialise cluster button (bottom-right of frame)
    var container = document.getElementById("mynetwork");
    var reinitBtn = document.createElement("button");
    reinitBtn.type = "button";
    reinitBtn.textContent = "Re-initialise cluster";
    reinitBtn.style.position = "absolute";
    reinitBtn.style.bottom = "10px";
    reinitBtn.style.right = "10px";
    reinitBtn.style.zIndex = "9999";
    reinitBtn.style.padding = "6px 10px";
    reinitBtn.style.fontSize = "13px";
    reinitBtn.style.borderRadius = "6px";
    reinitBtn.style.border = "1px solid #c7c7c7";
    reinitBtn.style.background = "rgba(255,255,255,0.95)";
    reinitBtn.style.cursor = "pointer";
    reinitBtn.style.boxShadow = "0 2px 6px rgba(0,0,0,0.15)";
    reinitBtn.addEventListener("click", recluster);
    container.appendChild(reinitBtn);

  });

})();
