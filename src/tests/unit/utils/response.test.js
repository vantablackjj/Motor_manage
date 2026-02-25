const { sendSuccess, sendError } = require("../../../utils/response");

describe("Response Utility", () => {
  let mockRes;

  beforeEach(() => {
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  test("sendSuccess should return 200 and correct structure", () => {
    const data = { id: 1, name: "Test" };
    sendSuccess(mockRes, data, "Success Message");

    expect(mockRes.status).toHaveBeenCalledWith(200);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Success Message",
        data: data,
      }),
    );
  });

  test("sendError should return specified status and correct structure", () => {
    sendError(mockRes, "Error Message", 404);

    expect(mockRes.status).toHaveBeenCalledWith(404);
    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: "Error Message",
      }),
    );
  });
});
