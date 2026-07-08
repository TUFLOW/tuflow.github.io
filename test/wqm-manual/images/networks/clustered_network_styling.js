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
    // Store original nodes
    nodes.get().forEach(n => {
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
          y: -550 + GROUP_SIZES[groupName] * 10,
          fixed: {"x": true, "y": true},
          font: {
            size: 16,
            color: "#000000",
            vadjust: 1  // puts label below circle
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

  });

})();
