# AWS EC2 Instance Types

Search and explore AWS EC2 instance types directly from Raycast.

## Features

- Fast and efficient search of EC2 instance types
- View detailed specifications:
  - vCPU count
  - Memory size
  - Storage options (EBS-only or instance store details)
  - Network bandwidth
  - EBS bandwidth
- Copy instance type name to clipboard with a single click

## Configuration

1. Ensure AWS credentials are configured in `~/.aws/credentials`
2. Permissions to describe EC2 instance types (`ec2:DescribeInstanceTypes`)
3. The extension will use the default AWS profile unless specified otherwise

## Usage

1. Open Raycast and search for "Search Instance Types"
2. Type to search for specific instance types (e.g., "t3.micro", "m5.large")
3. View detailed specifications in the list:
   - Title shows the instance type name
   - Subtitle displays vCPU and memory information
   - Accessories show storage, network, and EBS bandwidth details
4. Press Enter to copy the instance type name to clipboard

## Local Installation

1. Clone the repository
2. Run `npm install`
3. Run `npm run build`
4. Import Extension and specify this project.

or Run `npm run dev` to develop and debug the extension.
