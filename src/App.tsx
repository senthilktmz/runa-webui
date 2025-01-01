import React, { useState, useCallback } from "react";
import ReactFlow, {
    addEdge,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

// Import Ace core and mode in the correct order
import ace from "ace-builds/src-noconflict/ace";
window.ace = ace; // Make `ace` globally available
import "ace-builds/src-noconflict/mode-sh";
import "ace-builds/src-noconflict/theme-monokai";
import { encryptPayload } from "./crypto_helper";

const NODE_TYPE_DEFINITIONS = {
    node_type_definitions: [
        {
            name: "bash",
            description: "Executes bash scripts",
            icon_path: "",
            is_enabled: "true",
        },
        {
            name: "docker",
            description: "Executes Docker Image",
            icon_path: "",
            is_enabled: "true",
        },
        {
            name: "custom node",
            description: "Custom functionality",
            icon_path: "",
            is_enabled: "true",
        },
    ],
};

const initialNodes = [];
const initialEdges = [];

const App = () => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [selectedNode, setSelectedNode] = useState(null);
    const [currentNodeName, setCurrentNodeName] = useState("");
    const [currentNodeScript, setCurrentNodeScript] = useState("");
    const [currentNodeType, setCurrentNodeType] = useState("sh");
    const [currentNodeCategory, setCurrentNodeCategory] = useState(
        NODE_TYPE_DEFINITIONS.node_type_definitions[0].name
    );
    const [webSocketMessages, setWebSocketMessages] = useState([]); // Added state for WebSocket messages

    const addNode = () => {
        const id = `${nodes.length + 1}`;
        const newNode = {
            id,
            data: {
                label: `Node ${id}`,
                script: "",
                type: "sh",
                category: NODE_TYPE_DEFINITIONS.node_type_definitions[0].name,
            },
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            sourcePosition: "right",
            targetPosition: "left",
        };
        setNodes((nds) => [...nds, newNode]);
    };

    const onConnect = useCallback(
        (params) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.Arrow } }, eds)),
        [setEdges]
    );

    const onNodeClick = (event, node) => {
        setSelectedNode(node);
        setCurrentNodeName(node.data.label);
        setCurrentNodeScript(node.data.script);
        setCurrentNodeType(node.data.type);
        setCurrentNodeCategory(node.data.category);
    };

    const handleScriptChange = (value) => {
        setCurrentNodeScript(value);
    };

    const runWebSocketFlow = async () => {
        const keyBase64 = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
        const plaintext = JSON.stringify({
            request_params: {
                request_type: "command_execution",
                command_params: {
                    command_type: "run_bash_script",
                    run_mode: "async",
                    command_data: {
                        run_bash_script_data: {
                            script_data: "ZWNobyAnSGVsbG8sIFdvcmxkIScK",
                            script_data_type: "bash_script_b64_utf8",
                        },
                    },
                    command_progress_info_params: {
                        stream_progress_type: "realtime",
                    },
                },
            },
        });

        try {
            const encryptedPayload = await encryptPayload(keyBase64, plaintext);
            console.log("Encrypted payload ready");

            const ws = new WebSocket("ws://127.0.0.1:9191/exec_task_set");

            ws.onmessage = (event) => {
                console.log("Raw message (non-JSON):", event.data);
                setWebSocketMessages((prev) => [...prev, event.data]); // Append the message to state
            };

            ws.onopen = () => {
                console.log("WebSocket Connected");
                ws.send(JSON.stringify(encryptedPayload));
                console.log("Sent encrypted payload");
            };

            ws.onclose = () => {
                console.log("WebSocket closed");
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
            };
        } catch (error) {
            console.error("Error in WebSocket flow:", error);
        }
    };

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "10px", textAlign: "center" }}>
                <button onClick={addNode}>+ Add Node</button>
                <button onClick={runWebSocketFlow} style={{ marginLeft: "10px" }}>
                    exec_task_set
                </button>
            </div>
            <div style={{ display: "flex", height: "100%" }}>
                <div style={{ flex: 3 }}>
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onNodeClick={onNodeClick}
                        fitView
                        style={{ flex: 1 }}
                    >
                        <MiniMap />
                        <Controls />
                        <Background />
                    </ReactFlow>
                </div>
                <div style={{ flex: 1, padding: "10px", background: "#f4f4f4", overflowY: "auto" }}>
                    <h3>WebSocket Messages</h3>
                    {webSocketMessages.length === 0 ? (
                        <p>No messages received yet.</p>
                    ) : (
                        <ul>
                            {webSocketMessages.map((msg, index) => (
                                <li key={index} style={{ marginBottom: "10px", wordWrap: "break-word" }}>
                                    {msg}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
