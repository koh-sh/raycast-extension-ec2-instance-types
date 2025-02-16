import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { EC2Client, DescribeInstanceTypesCommand, InstanceTypeInfo } from "@aws-sdk/client-ec2";
import { useState, useEffect } from "react";

const DEFAULT_MAX_RESULTS = 100;

interface CommandProps {
  arguments: {
    search: string;
  };
}

interface InstanceTypeDetails {
  instanceType: string;
  vcpus: number;
  memoryGiB: number;
  storage: string;
  networkBandwidth: string;
  ebsBandwidth: string;
}

interface FetchError extends Error {
  code?: string;
  requestId?: string;
}

function formatInstanceTypeDetails(type: InstanceTypeInfo): InstanceTypeDetails {
  return {
    instanceType: type.InstanceType || "",
    vcpus: type.VCpuInfo?.DefaultVCpus || 0,
    memoryGiB: type.MemoryInfo?.SizeInMiB ? type.MemoryInfo.SizeInMiB / 1024 : 0,
    storage: formatStorage(type),
    networkBandwidth: formatNetworkBandwidth(type),
    ebsBandwidth: formatEbsBandwidth(type),
  };
}

function formatStorage(type: InstanceTypeInfo): string {
  if (!type.InstanceStorageInfo?.Disks?.length) {
    return "EBS-Only";
  }

  const disk = type.InstanceStorageInfo.Disks[0];
  const diskCount = disk.Count || 0;
  const diskSize = disk.SizeInGB || 0;
  const diskType = type.InstanceStorageInfo.NvmeSupport === "required" ? "NVMe SSD" : "SSD";

  return diskCount === 1 ? `1 x ${diskSize} ${diskType}` : `${diskCount} x ${diskSize} ${diskType}`;
}

function formatNetworkBandwidth(type: InstanceTypeInfo): string {
  const performance = type.NetworkInfo?.NetworkPerformance;
  if (!performance) {
    return "-";
  }

  if (performance.toLowerCase().includes("up to")) {
    return performance;
  }

  return !isNaN(Number(performance)) ? `${performance} Gbps` : performance;
}

function formatEbsBandwidth(type: InstanceTypeInfo): string {
  const throughput = type.EbsInfo?.EbsOptimizedInfo?.MaximumBandwidthInMbps;
  if (!throughput) {
    return "-";
  }

  return throughput >= 1000 ? `${throughput.toLocaleString()} Mbps` : `Up to ${throughput.toLocaleString()} Mbps`;
}

async function fetchInstanceTypes(searchQuery?: string): Promise<InstanceTypeInfo[]> {
  const client = new EC2Client({});
  let allInstanceTypes: InstanceTypeInfo[] = [];
  let nextToken: string | undefined;

  const filters = searchQuery
    ? {
        Filters: [
          {
            Name: "instance-type",
            Values: [`*${searchQuery}*`],
          },
        ],
      }
    : {};

  try {
    do {
      const command = new DescribeInstanceTypesCommand({
        ...filters,
        NextToken: nextToken,
        MaxResults: DEFAULT_MAX_RESULTS,
      });
      const response = await client.send(command);

      if (response.InstanceTypes) {
        allInstanceTypes = [...allInstanceTypes, ...response.InstanceTypes];
      }

      nextToken = response.NextToken;
    } while (nextToken);

    return allInstanceTypes.sort((a, b) => (a.InstanceType || "").localeCompare(b.InstanceType || ""));
  } catch (error) {
    const fetchError = error as FetchError;
    throw new Error(
      `Failed to fetch instance types: ${fetchError.message}${fetchError.code ? ` (${fetchError.code})` : ""}`,
    );
  }
}

export default function Command(props: CommandProps) {
  const [instanceTypes, setInstanceTypes] = useState<InstanceTypeInfo[]>([]);
  const [filteredInstanceTypes, setFilteredInstanceTypes] = useState<InstanceTypeInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState(props.arguments.search || "");

  useEffect(() => {
    async function loadInstanceTypes() {
      try {
        const types = await fetchInstanceTypes(props.arguments.search);
        setInstanceTypes(types);
        setFilteredInstanceTypes(types);
      } catch (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch instance types",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadInstanceTypes();
  }, [props.arguments.search]);

  useEffect(() => {
    if (searchText === props.arguments.search) {
      return;
    }

    const filtered = instanceTypes.filter((type) =>
      type.InstanceType?.toLowerCase().includes(searchText.toLowerCase()),
    );
    setFilteredInstanceTypes(filtered);
  }, [searchText, instanceTypes, props.arguments.search]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search by instance type (e.g., t3.micro, m5.large)"
      onSearchTextChange={setSearchText}
      filtering={false}
      searchText={searchText}
    >
      <List.EmptyView icon={Icon.Cloud} title="No Instance Types Found" description="Try adjusting your search query" />
      {filteredInstanceTypes.map((type) => {
        const details = formatInstanceTypeDetails(type);
        return (
          <List.Item
            key={details.instanceType}
            icon={Icon.Terminal}
            title={details.instanceType}
            subtitle={`${details.vcpus} vCPUs, ${details.memoryGiB.toFixed(0)} GiB`}
            accessories={[
              { text: details.storage },
              { text: details.networkBandwidth },
              { text: details.ebsBandwidth },
            ]}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={details.instanceType} />
              </ActionPanel>
            }
          />
        );
      })}
    </List>
  );
}
