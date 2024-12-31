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
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-sh";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-xml";
import "ace-builds/src-noconflict/mode-yaml";
import "ace-builds/src-noconflict/theme-monokai";
import { encryptPayload , clientEncryptAndServerDecryptTest } from "./crypto_helper";

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
    const [currentNodeType, setCurrentNodeType] = useState("python");
    const [currentNodeCategory, setCurrentNodeCategory] = useState(
        NODE_TYPE_DEFINITIONS.node_type_definitions[0].name
    );
    const [isEditorPopupOpen, setIsEditorPopupOpen] = useState(false);
    //
    const addNode = () => {
        const id = `${nodes.length + 1}`;
        const newNode = {
            id,
            data: {
                label: `Node ${id}`,
                script: "",
                type: "python",
                category: NODE_TYPE_DEFINITIONS.node_type_definitions[0].name,
            },
            position: { x: Math.random() * 400, y: Math.random() * 400 },
            sourcePosition: "right",
            targetPosition: "left",
            style: {
                width: "50px", // Set the width explicitly to reduce it
            },
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

    const handleNameChange = (e) => {
        setCurrentNodeName(e.target.value);
    };

    const handleScriptChange = (value) => {
        setCurrentNodeScript(value);
    };

    const handleTypeChange = (e) => {
        setCurrentNodeType(e.target.value);
    };

    const handleCategoryChange = (e) => {
        setCurrentNodeCategory(e.target.value);
    };

    const saveNodeData = () => {
        if (selectedNode) {
            setNodes((nds) =>
                nds.map((n) =>
                    n.id === selectedNode.id
                        ? {
                            ...n,
                            data: {
                                ...n.data,
                                label: currentNodeName,
                                script: currentNodeScript,
                                type: currentNodeType,
                                category: currentNodeCategory,
                            },
                        }
                        : n
                )
            );
            alert("Node data saved!");
        }
    };

    const toggleEditorPopup = () => {
        setIsEditorPopupOpen(!isEditorPopupOpen);
    };

    const getParentChildMap = () => {
        const map = new Map();
        edges.forEach((edge) => {
            const parent = edge.source;
            const child = edge.target;
            if (!map.has(parent)) {
                map.set(parent, { children: [], parents: [] });
            }
            if (!map.has(child)) {
                map.set(child, { children: [], parents: [] });
            }
            map.get(parent).children.push(child);
            map.get(child).parents.push(parent);
        });
        return map;
    };

    const topologicalSort = () => {
        const map = getParentChildMap();
        const visited = new Set();
        const result = [];

        const visit = (node) => {
            if (!visited.has(node)) {
                visited.add(node);
                const children = map.get(node)?.children || [];
                children.forEach(visit);
                result.push(node);
            }
        };

        nodes.forEach((node) => visit(node.id));
        return result.reverse(); // Parent-first order
    };

    const serializeNodes = (nodes, edges) => {
        const nodeMap = new Map();

        // Initialize each node with children
        nodes.forEach((node) => {
            nodeMap.set(node.id, { children: {}, ...node.data });
        });

        // Populate children based on edges
        edges.forEach((edge) => {
            const parent = nodeMap.get(edge.source);
            if (parent) {
                parent.children[edge.target] = nodeMap.get(edge.target);
            }
        });

        // Collect root nodes (nodes without incoming edges)
        const allNodes = {};
        nodeMap.forEach((value, key) => {
            if (!edges.some((edge) => edge.target === key)) {
                allNodes[key] = value; // Root nodes
            }
        });

        console.log("Serialized Nodes:", JSON.stringify(allNodes, null, 2));
        return allNodes; // Return the serialized nodes
    };

    const [isProcessing, setIsProcessing] = useState(false); // Optional loading state


    const runFlow = async () => {
        const keyBase64 = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="; // Base64-encoded key
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

        console.log("Original Plaintext:", plaintext);

        try {
            // Encrypt the payload
            const encryptedPayload = await encryptPayload(keyBase64, plaintext);
            console.log("Encrypted Payload:", encryptedPayload);

            // Serialize the encrypted payload as a string
            const serializedPayload = JSON.stringify(encryptedPayload);


            // Send the serialized payload to the server
            const response = await fetch("http://127.0.0.1:9191/task_agent", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(serializedPayload), // Wrap as a string
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP error! Status: ${response.status}, Details: ${errorText}`);
            }

            const result = await response.json();
            console.log("Server Response:", result);
            alert("Payload sent and processed successfully!");
        } catch (error) {
            console.error("Error during encryption or sending payload:", error.message);
            alert(`Failed to send payload: ${error.message}`);
        }
    };

    const runWebSocketFlow = async () => {
        const keyBase64 = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY="; // Base64-encoded key
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

        console.log("Original Plaintext:", plaintext);

        try {
            // Encrypt the payload
            const encryptedPayload = await encryptPayload(keyBase64, plaintext);
            console.log("Encrypted Payload:", encryptedPayload);

            // Open a WebSocket connection
            const ws = new WebSocket("ws://127.0.0.1:9191/exec_task_set");

            ws.onopen = () => {
                console.log("WebSocket connection opened.");
                // Send the encrypted payload
                ws.send(JSON.stringify(encryptedPayload));
                console.log("Encrypted payload sent.");
            };

            ws.onmessage = (event) => {
                console.log("Message from server:", event.data);
            };

            ws.onclose = () => {
                console.log("WebSocket connection closed.");
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
            };
        } catch (error) {
            console.error("Error during WebSocket execution:", error.message);
        }
    };

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <div style={{padding: "10px", textAlign: "center"}}>
                <button onClick={addNode}>+ Add Node</button>
                <button onClick={runFlow} style={{marginLeft: "10px"}}>
                    Run
                </button>
                <button onClick={runWebSocketFlow} style={{marginLeft: "10px"}}>
                    exec_task_set
                </button>
            </div>
            <div style={{display: "flex", height: "100%"}}>
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
                {selectedNode && (
                    <div style={{ flex: 1, padding: "10px", background: "#f4f4f4" }}>
                        <h3>Edit Node</h3>
                        <label>
                            Node Name:
                            <input
                                type="text"
                                value={currentNodeName}
                                onChange={handleNameChange}
                                style={{
                                    width: "100%",
                                    marginBottom: "10px",
                                    padding: "5px",
                                    fontSize: "16px",
                                }}
                            />
                        </label>
                        <label>
                            Node Category:
                            <select
                                value={currentNodeCategory}
                                onChange={handleCategoryChange}
                                style={{
                                    width: "100%",
                                    marginBottom: "10px",
                                    padding: "5px",
                                    fontSize: "16px",
                                }}
                            >
                                {NODE_TYPE_DEFINITIONS.node_type_definitions.map((def) => (
                                    <option key={def.name} value={def.name}>
                                        {def.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            Script:
                            <AceEditor
                                mode={currentNodeType}
                                theme="monokai"
                                value={currentNodeScript}
                                onChange={handleScriptChange}
                                name="script_editor"
                                editorProps={{ $blockScrolling: true }}
                                setOptions={{ useWorker: false }}
                                width="100%"
                                height="150px"
                            />
                        </label>
                        <button
                            onClick={toggleEditorPopup}
                            style={{
                                marginTop: "10px",
                                padding: "10px 15px",
                                fontSize: "16px",
                                cursor: "pointer",
                            }}
                        >
                            Expand Editor
                        </button>
                        <button
                            onClick={saveNodeData}
                            style={{
                                marginTop: "10px",
                                padding: "10px 15px",
                                fontSize: "16px",
                                marginLeft: "10px",
                                cursor: "pointer",
                            }}
                        >
                            Save
                        </button>
                    </div>
                )}
            </div>

            {/* Popup Editor */}
            {isEditorPopupOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: "80%",
                        height: "70%",
                        backgroundColor: "#fff",
                        border: "1px solid #ccc",
                        boxShadow: "0 0 10px rgba(0, 0, 0, 0.3)",
                        zIndex: 1000,
                        padding: "20px",
                    }}
                >
                    <h3>Expanded Editor</h3>
                    <AceEditor
                        mode={currentNodeType}
                        theme="monokai"
                        value={currentNodeScript}
                        onChange={handleScriptChange}
                        name="popup_script_editor"
                        editorProps={{ $blockScrolling: true }}
                        setOptions={{ useWorker: false }}
                        width="100%"
                        height="calc(100% - 50px)"
                    />
                    <button
                        onClick={toggleEditorPopup}
                        style={{
                            marginTop: "10px",
                            padding: "10px 15px",
                            fontSize: "16px",
                            cursor: "pointer",
                        }}
                    >
                        Close
                    </button>
                </div>
            )}
            {isEditorPopupOpen && (
                <div
                    onClick={toggleEditorPopup}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        backgroundColor: "rgba(0, 0, 0, 0.5)",
                        zIndex: 999,
                    }}
                />
            )}
        </div>
    );
};

export default App;
