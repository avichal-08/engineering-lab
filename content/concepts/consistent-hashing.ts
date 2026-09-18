import { Concept } from "./types";

export const consistentHashing: Concept = {
  slug: "consistent-hashing",
  title: "Consistent Hashing & Ring Partitioning",
  shortDescription:
    "Distribute keys across a dynamic cluster of nodes so that adding or removing a node rehashes only K/N keys rather than 100% of the dataset.",
  category: "Distributed Systems",
  difficulty: "Advanced",
  estimatedTime: "~30 min",
  topics: [
    "Hash Ring Topology",
    "Modulo Hashing Flaw",
    "Virtual Nodes (vnodes)",
    "Key Rebalancing Minimization",
    "Hotspot Mitigation",
    "Dynamo Architecture",
  ],

  overview: {
    problemStatement:
      "When partitioning data across N cache or database servers, traditional hashing uses modulo math: serverIndex = hash(key) % N. However, when server count N changes (a node crashes, or autoscaling scales from 9 to 10 nodes), nearly 100% of all keys map to entirely different servers. In a distributed cache, this causes an instant 100% cache miss rate, triggering a total database collapse.",
    whenToUse: [
      "Distributed in-memory caching tiers (e.g. Memcached, Redis clusters).",
      "Distributed key-value stores (Amazon DynamoDB, Apache Cassandra, Riak).",
      "Load balancer sticky session routing across dynamic fleets.",
      "Distributed file systems and object storage chunk allocation.",
    ],
    whenNotToUse: [
      "Single-node datastores where data fits comfortably on one machine.",
      "Workloads requiring global ordered range scans (use range-partitioning like Google Bigtable instead).",
      "Systems with static, unchanging node counts where simple modulo hashing suffices.",
    ],
    coreInvariant:
      "When the node cluster scales from N to N+1 (or N-1), at most K/N keys must be migrated, where K is the total number of keys and N is the number of nodes.",
  },

  whyItExists: {
    realWorldProblem:
      "Suppose 10 Redis cache servers hold 10,000,000 cached user sessions using `hash(key) % 10`. Server #4 experiences hardware failure, dropping cluster size to 9. Now, `hash(key) % 9` produces a different integer for over 90% of all keys. All 10 million sessions are immediately treated as cache misses. The primary database is slammed with 100,000 queries/second and crashes within 3 seconds.",
    catastrophicScenario:
      "An image CDN caches 500 million user avatars across 50 origin cache instances. Autoscaling detects slightly elevated traffic and adds 1 new node (50 -> 51 nodes). Under modulo hashing, 98% of all cache lookups miss their target node simultaneously. The origin storage backend is pummeled by 500 million requests, driving bandwidth bills to hundreds of thousands of dollars and causing global 504 Gateway Timeouts.",
    systemImpact: [
      "Near-100% cache miss rate upon adding or removing a single node.",
      "Immediate thundering herd hammering underlying persistent databases.",
      "Massive network bandwidth saturation attempting to warm cold nodes.",
      "Inability to dynamically autoscale caching infrastructure during traffic peaks.",
    ],
  },

  howItWorks: {
    theoreticalExplanation: [
      "Consistent Hashing maps both data keys and server nodes onto the same circular integer coordinate space—the 'Hash Ring' (typically 0 to 2^32 - 1).",
      "Each server node's IP address or hostname is hashed to an integer position on the ring. Data keys are hashed using the exact same hash function onto the ring.",
      "To find which server owns a given key, the algorithm walks clockwise from the key's position on the ring until it encounters the first server node. That node is the owner.",
      "When a new node is inserted into the ring, it only takes ownership of the keys located between its position and the preceding node. All other nodes retain 100% of their existing keys. Only K/N keys relocate.",
      "To prevent uneven key clustering (hotspots) due to non-uniform hash distribution, each physical node is assigned multiple 'Virtual Nodes' (vnodes, typically 100-300 points spread randomly around the ring). This ensures near-perfect uniform data distribution.",
    ],
    singleVsDistributed:
      "Single client routing hashes keys locally using an in-memory sorted binary search tree (O(log M)). Distributed coordinator rings (like Cassandra) use gossip protocols to synchronize node ring memberships and partition ownership across the cluster.",
    semanticsAndGuarantees: [
      "Minimal disruption: Only K/N keys move on node membership changes.",
      "Smooth scalability: Adding nodes increases cluster capacity linearly.",
      "Balanced distribution: Virtual nodes prevent hot spots and load skews.",
    ],
    keyAlgorithms: [
      {
        name: "Virtual Nodes (vnodes)",
        description: "Replicates physical node P across V points on the ring by hashing `node_ip#0`, `node_ip#1`, ..., `node_ip#V`.",
        pros: "Provides near-perfect statistical uniformity (+/- 5% variance); handles heterogeneous hardware by varying vnode counts.",
        cons: "Increases binary search tree size and ring traversal memory.",
      },
      {
        name: "Binary Search Tree (O(log V) Lookup)",
        description: "Stores sorted ring token hashes in an array or red-black tree; locates owner node via binary search (upper_bound).",
        pros: "Fast O(log V) lookup time; deterministic.",
        cons: "Requires tree rebuild or sorted insertion on node addition/removal.",
      },
      {
        name: "Jump Consistent Hash",
        description: "Google's ultra-fast O(ln N) memory-less consistent hash algorithm: `h = (h + 1) * 2862933555777941757ULL + 1`.",
        pros: "Zero memory footprint; extremely fast; mathematically optimal key movement.",
        cons: "Only supports appending/removing nodes from the end; cannot remove arbitrary interior nodes.",
      },
    ],
  },

  visualizerType: "hash-ring",

  buildSteps: [
    {
      stepNumber: 1,
      title: "Choose Consistent Hash Function",
      summary: "Select a fast, uniformly distributed 32-bit or 64-bit hash algorithm.",
      explanation:
        "Cryptographic hashes like MD5 or SHA-256 provide excellent distribution. Fast non-cryptographic hashes like MurmurHash3 or xxHash are ideal for high throughput.",
      pseudocode: `function hash(key: string) -> uint32:
  return murmur3_32(key)`,
      considerations: [
        "Ensure the hash function treats uppercase/lowercase and string encodings consistently across all client languages.",
      ],
    },
    {
      stepNumber: 2,
      title: "Design Hash Ring Data Structure",
      summary: "Store node token positions in a sorted array or binary search tree.",
      explanation:
        "Maintain a sorted array of 32-bit token integers paired with a lookup map linking token -> physical node ID.",
      pseudocode: `struct HashRing {
  sortedTokens: Array<uint32>
  tokenToNode: Map<uint32, string>
  vnodesPerNode: int
}`,
      considerations: [
        "In Go, use `sort.Search`. In Java, use `TreeMap.ceilingKey()`. In TypeScript, use binary search on a sorted array.",
      ],
    },
    {
      stepNumber: 3,
      title: "Implement Virtual Node Generation",
      summary: "Map each physical server to V distributed points across the ring.",
      explanation:
        "For node 'node-1', hash 'node-1#0', 'node-1#1', ..., 'node-1#150'. Insert each token into the sorted array and map to 'node-1'.",
      considerations: [
        "100 to 256 vnodes per physical node reduces standard deviation of key distribution below 5%.",
      ],
    },
    {
      stepNumber: 4,
      title: "Implement Key Lookup (Clockwise Walk)",
      summary: "Hash the key and find the first node token >= keyToken.",
      explanation:
        "Binary search for the first token >= hash(key). If hash(key) is greater than the largest token on the ring, wrap around to token 0 (the ring property).",
      pseudocode: `function getNode(key):
  if ring is empty: return nil
  keyToken = hash(key)
  idx = binarySearchFirstGreaterOrEqual(sortedTokens, keyToken)
  if idx == sortedTokens.length:
    idx = 0 // Wrap around clockwise
  token = sortedTokens[idx]
  return tokenToNode[token]`,
      considerations: [
        "The wrap-around step is what makes the structure a circular ring.",
      ],
    },
    {
      stepNumber: 5,
      title: "Implement Node Addition & Key Rebalancing",
      summary: "Add a physical node and identify keys to migrate.",
      explanation:
        "Insert new vnodes into the ring. Only keys between each new vnode and its counter-clockwise predecessor move to the new node.",
      considerations: [
        "Stream keys asynchronously during rebalance to prevent traffic interruption.",
      ],
    },
    {
      stepNumber: 6,
      title: "Implement Node Removal & Failover",
      summary: "Evict failed node tokens and route requests to next clockwise healthy node.",
      explanation:
        "Remove all vnodes belonging to the failed server. Any keys previously managed by that node automatically fall clockwise onto the next surviving node.",
      considerations: [
        "Surviving nodes will experience increased traffic; size capacity with headroom.",
      ],
    },
    {
      stepNumber: 7,
      title: "Weighted Node Allocations",
      summary: "Support heterogeneous servers with different CPU/RAM capacities.",
      explanation:
        "Give a 64GB server 200 vnodes and a 16GB server 50 vnodes. The 64GB server automatically receives 4x the key volume.",
      considerations: [
        "Enables zero-downtime hardware upgrades by scaling vnode weights.",
      ],
    },
  ],

  codeImplementations: {
    go: {
      filename: "hashring.go",
      code: `package hashring

import (
	"fmt"
	"hash/fnv"
	"sort"
	"strconv"
	"sync"
)

type HashRing struct {
	mu            sync.RWMutex
	vnodes        int
	sortedTokens  []uint32
	tokenToNode   map[uint32]string
	physicalNodes map[string]bool
}

func NewHashRing(vnodes int) *HashRing {
	return &HashRing{
		vnodes:        vnodes,
		tokenToNode:   make(map[uint32]string),
		physicalNodes: make(map[string]bool),
	}
}

func hashKey(key string) uint32 {
	h := fnv.New32a()
	h.Write([]byte(key))
	return h.Sum32()
}

// AddNode registers a physical server across multiple virtual node ring positions.
func (hr *HashRing) AddNode(node string) {
	hr.mu.Lock()
	defer hr.mu.Unlock()

	if hr.physicalNodes[node] {
		return
	}
	hr.physicalNodes[node] = true

	for i := 0; i < hr.vnodes; i++ {
		vnodeKey := node + "#" + strconv.Itoa(i)
		token := hashKey(vnodeKey)
		hr.sortedTokens = append(hr.sortedTokens, token)
		hr.tokenToNode[token] = node
	}

	sort.Slice(hr.sortedTokens, func(i, j int) bool {
		return hr.sortedTokens[i] < hr.sortedTokens[j]
	})
}

// RemoveNode unregisters a physical node and evicts all its virtual node tokens.
func (hr *HashRing) RemoveNode(node string) {
	hr.mu.Lock()
	defer hr.mu.Unlock()

	if !hr.physicalNodes[node] {
		return
	}
	delete(hr.physicalNodes, node)

	newSorted := make([]uint32, 0, len(hr.sortedTokens)-hr.vnodes)
	for _, token := range hr.sortedTokens {
		if hr.tokenToNode[token] == node {
			delete(hr.tokenToNode, token)
		} else {
			newSorted = append(newSorted, token)
		}
	}
	hr.sortedTokens = newSorted
}

// GetNode maps a key to its owning physical server via clockwise ring walk.
func (hr *HashRing) GetNode(key string) (string, error) {
	hr.mu.RLock()
	defer hr.mu.RUnlock()

	if len(hr.sortedTokens) == 0 {
		return "", fmt.Errorf("hash ring is empty")
	}

	keyToken := hashKey(key)

	// Binary search for first token >= keyToken
	idx := sort.Search(len(hr.sortedTokens), func(i int) bool {
		return hr.sortedTokens[i] >= keyToken
	})

	// Wrap around clockwise if keyToken is greater than all ring tokens
	if idx == len(hr.sortedTokens) {
		idx = 0
	}

	token := hr.sortedTokens[idx]
	return hr.tokenToNode[token], nil
}`,
      explanation:
        "Production Go Consistent Hash ring implementation featuring Virtual Nodes, binary search lookup via sort.Search, and clockwise wrap-around semantics.",
      keyDecisions: [
        "sort.Search delivers O(log(V * N)) binary search performance.",
        "Clockwise wrap-around ensures full 360-degree circular ring coverage.",
      ],
      complexityNotes: "Lookup time O(log(V * N)). Memory O(V * N).",
    },

    typescript: {
      filename: "ConsistentHashRing.ts",
      code: `export class ConsistentHashRing {
  private sortedTokens: number[] = [];
  private tokenToNode = new Map<number, string>();
  private nodes = new Set<string>();

  constructor(private readonly vnodes: number = 100) {}

  private hash(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0; // 32-bit unsigned integer
  }

  public addNode(node: string): void {
    if (this.nodes.has(node)) return;
    this.nodes.add(node);

    for (let i = 0; i < this.vnodes; i++) {
      const token = this.hash(\`\${node}#\${i}\`);
      this.sortedTokens.push(token);
      this.tokenToNode.set(token, node);
    }

    this.sortedTokens.sort((a, b) => a - b);
  }

  public removeNode(node: string): void {
    if (!this.nodes.has(node)) return;
    this.nodes.delete(node);

    this.sortedTokens = this.sortedTokens.filter((token) => {
      if (this.tokenToNode.get(token) === node) {
        this.tokenToNode.delete(token);
        return false;
      }
      return true;
    });
  }

  public getNode(key: string): string | null {
    if (this.sortedTokens.length === 0) return null;

    const keyToken = this.hash(key);
    let low = 0;
    let high = this.sortedTokens.length - 1;
    let targetIdx = 0;

    // Binary search
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.sortedTokens[mid] >= keyToken) {
        targetIdx = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    const token = this.sortedTokens[targetIdx];
    return this.tokenToNode.get(token) ?? null;
  }
}`,
      explanation:
        "TypeScript implementation utilizing FNV-1a 32-bit unsigned hashing, virtual node distribution, and custom binary search for sub-microsecond key partition routing.",
      keyDecisions: [
        "Unsigned 32-bit bitshift (>>> 0) ensures non-negative coordinate ring space.",
        "Manual binary search eliminates external dependency overhead.",
      ],
      complexityNotes: "O(log(V * N)) binary search lookup time.",
    },

    python: {
      filename: "consistent_hash.py",
      code: `import bisect
import hashlib
from typing import Optional, List, Dict

class ConsistentHashRing:
    def __init__(self, vnodes: int = 100):
        self.vnodes = vnodes
        self.sorted_tokens: List[int] = []
        self.token_to_node: Dict[int, str] = {}
        self.nodes = set()

    def _hash(self, key: str) -> int:
        md5_bytes = hashlib.md5(key.encode("utf-8")).digest()
        return int.from_bytes(md5_bytes[:4], byteorder="big")

    def add_node(self, node: str):
        if node in self.nodes:
            return
        self.nodes.add(node)

        for i in range(self.vnodes):
            token = self._hash(f"{node}#{i}")
            bisect.insort(self.sorted_tokens, token)
            self.token_to_node[token] = node

    def remove_node(self, node: str):
        if node not in self.nodes:
            return
        self.nodes.remove(node)

        self.sorted_tokens = [
            token for token in self.sorted_tokens
            if self.token_to_node[token] != node
        ]
        self.token_to_node = {
            t: n for t, n in self.token_to_node.items() if n != node
        }

    def get_node(self, key: str) -> Optional[str]:
        if not self.sorted_tokens:
            return None

        key_token = self._hash(key)
        # bisect_right finds first element strictly greater
        idx = bisect.bisect_right(self.sorted_tokens, key_token)

        if idx == len(self.sorted_tokens):
            idx = 0 # Wrap around clockwise

        token = self.sorted_tokens[idx]
        return self.token_to_node[token]`,
      explanation:
        "Python implementation using bisect.insort and bisect.bisect_right for C-optimized logarithmic binary search over the hash ring.",
      keyDecisions: [
        "bisect library provides C-speed binary searches in Python standard library.",
        "MD5 32-bit truncation ensures uniform spatial distribution.",
      ],
      complexityNotes: "O(log(V * N)) lookup time.",
    },

    java: {
      filename: "ConsistentHashRing.java",
      code: `package com.engineeringlab.hashring;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Collection;
import java.util.SortedMap;
import java.util.TreeMap;

public class ConsistentHashRing<T> {
    private final int numberOfReplicas;
    private final SortedMap<Long, T> circle = new TreeMap<>();

    public ConsistentHashRing(int numberOfReplicas, Collection<T> nodes) {
        this.numberOfReplicas = numberOfReplicas;
        for (T node : nodes) {
            addNode(node);
        }
    }

    private long hash(String key) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] digest = md.digest(key.getBytes(StandardCharsets.UTF_8));
            return ((long) (digest[3] & 0xFF) << 24) |
                   ((long) (digest[2] & 0xFF) << 16) |
                   ((long) (digest[1] & 0xFF) << 8) |
                   ((long) (digest[0] & 0xFF));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
    }

    public synchronized void addNode(T node) {
        for (int i = 0; i < numberOfReplicas; i++) {
            circle.put(hash(node.toString() + "#" + i), node);
        }
    }

    public synchronized void removeNode(T node) {
        for (int i = 0; i < numberOfReplicas; i++) {
            circle.remove(hash(node.toString() + "#" + i));
        }
    }

    public synchronized T get(String key) {
        if (circle.isEmpty()) return null;

        long hash = hash(key);
        if (!circle.containsKey(hash)) {
            SortedMap<Long, T> tailMap = circle.tailMap(hash);
            hash = tailMap.isEmpty() ? circle.firstKey() : tailMap.firstKey();
        }
        return circle.get(hash);
    }
}`,
      explanation:
        "Canonical Java implementation leveraging java.util.TreeMap (Red-Black Tree) and tailMap() for logarithmic ceiling token lookups with circular wrap-around.",
      keyDecisions: [
        "TreeMap.tailMap() delivers O(log M) ceiling lookup in red-black tree.",
        "circle.firstKey() provides instantaneous wrap-around when tailMap is empty.",
      ],
      complexityNotes: "O(log(V * N)) lookup time in red-black tree.",
    },
  },

  edgeCases: [
    {
      scenario: "Non-Uniform Hash Distribution (Hotspot Clustering)",
      consequence:
        "With only 3 physical nodes and 0 virtual nodes, random hash variance places Node A and Node B close together, forcing Node C to own 80% of the ring.",
      solution:
        "Configure at least 150 to 300 virtual nodes per physical machine to guarantee balanced spatial dispersion.",
    },
    {
      scenario: "Cascading Node Failure Domino Effect",
      consequence:
        "Node B fails. All of Node B's keys fall directly onto Node C. Node C cannot handle 2x its normal traffic, crashes, and dumps 3x traffic onto Node D.",
      solution:
        "Virtual nodes solve this! Because Node B's virtual nodes were interleaved with all other servers, Node B's keys are distributed evenly across ALL surviving nodes (1/N to each), rather than crushing a single neighbor.",
    },
  ],

  production: {
    failureModes: [
      {
        title: "Split-Brain Ring Topology",
        description:
          "Two separate clusters have differing views of which nodes are alive, leading to partitioned, contradictory key writes.",
        mitigation:
          "Use strong consensus protocols (Raft, etcd) or gossip protocols with vector clocks to propagate ring topology changes.",
      },
    ],
    scaling10x: [
      "Cache the sorted tokens array and use Read-Copy-Update (RCU) on node mutations to keep lookups lock-free.",
      "Assign dynamic vnode counts proportional to individual server hardware capacity (e.g. RAM/CPU).",
    ],
    concurrencyRaceConditions: [
      "Simultaneous reads and ring mutations: Synchronize with sync.RWMutex or immutable atomic pointers.",
    ],
    observability: {
      metrics: [
        "hash_ring_physical_nodes_gauge",
        "hash_ring_total_vnodes_gauge",
        "hash_ring_key_distribution_stddev",
      ],
      logs: [
        "Log INFO when node joins/leaves ring with rebalance percentage estimate.",
      ],
      traces: [
        "Record target node selection in trace tags: 'storage.node: cache-04'.",
      ],
    },
    securityNotes: [
      "Avoid using predictable sequential node names in untrusted multi-tenant environments.",
    ],
  },

  tradeoffs: [
    {
      approach: "Consistent Hashing with Vnodes",
      advantages: "Only K/N keys rehashed on topology change; uniform load distribution; hardware weighting.",
      disadvantages: "Requires in-memory sorted ring; slightly higher lookup complexity O(log V*N).",
      useWhen: "Dynamic distributed caching and sharded database storage tiers.",
    },
    {
      approach: "Naive Modulo Hashing (hash % N)",
      advantages: "Instantaneous O(1) computation; zero memory overhead.",
      disadvantages: "Nearly 100% of keys relocate whenever N changes; disastrous for caching.",
      useWhen: "Completely static node clusters with zero runtime autoscaling.",
    },
  ],

  furtherReading: [
    {
      title: "Consistent Hashing and Random Trees: Distributed Caching Protocols",
      type: "Paper",
      authorOrOrg: "David Karger et al. (MIT / Akamai, 1997)",
      description: "The seminal academic paper that invented consistent hashing for web caching.",
      url: "https://www.cs.princeton.edu/courses/archive/fall09/cos518/papers/chash.pdf",
    },
    {
      title: "Dynamo: Amazon's Highly Available Key-value Store",
      type: "Paper",
      authorOrOrg: "Amazon Engineering (SOSP 2007)",
      description: "How Amazon utilized consistent hashing with virtual nodes to power global e-commerce.",
      url: "https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf",
    },
  ],
};
