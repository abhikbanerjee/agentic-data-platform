import XCTest
@testable import AgenticDT

final class AgenticDTTests: XCTestCase {

    // MARK: - ViewModel Tests

    @MainActor func testInitialState() {
        let vm = PlatformViewModel()
        XCTAssertEqual(vm.pipelines.count, 6)
        XCTAssertEqual(vm.dataSources.count, 6)
        XCTAssertFalse(vm.isScanningSource)
        XCTAssertFalse(vm.isAgentTyping)
        XCTAssertTrue(vm.chatMessages.isEmpty)
    }

    @MainActor func testPipelineHealthCounts() {
        let vm = PlatformViewModel()
        let healthy = vm.pipelines.filter { $0.status == .healthy }.count
        let healing = vm.pipelines.filter { $0.status == .healing }.count
        let failed  = vm.pipelines.filter { $0.status == .failed  }.count
        XCTAssertEqual(healthy + healing + failed, vm.pipelines.count)
    }

    @MainActor func testQualityFix() {
        let vm = PlatformViewModel()
        let issue = vm.qualityIssues[0]
        XCTAssertFalse(issue.isFixed)
        vm.applyQualityFix(id: issue.id)
        XCTAssertTrue(vm.qualityIssues[0].isFixed)
    }

    @MainActor func testSampleDataIntegrity() {
        XCTAssertFalse(DataPipeline.samples.isEmpty)
        XCTAssertFalse(DataSource.samples.isEmpty)
        XCTAssertFalse(PublishedDataset.samples.isEmpty)
        XCTAssertFalse(QualityIssue.samples.isEmpty)
        XCTAssertFalse(AgentActivity.samples.isEmpty)
    }

    @MainActor func testOverallQualityScore() {
        let vm = PlatformViewModel()
        XCTAssertGreaterThan(vm.overallQualityScore, 0.9)
        XCTAssertLessThanOrEqual(vm.overallQualityScore, 1.0)
    }

    @MainActor func testActiveAgentCount() {
        let vm = PlatformViewModel()
        XCTAssertGreaterThan(vm.activeAgentCount, 0)
    }
}
