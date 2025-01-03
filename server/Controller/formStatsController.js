const FormStat = require("../Schemas/formStatSchema");
const FormResponse = require("../Schemas/formResponseSchema");


const incrementFormView = async (formId, userId, ipAddress) => {
  try {
    const stats = await FormStat.findOneAndUpdate(
      { formId },
      {
        $inc: { views: 1 },
        $push: {
          uniqueViews: {
            userId,
            ipAddress,
            timestamp: new Date()
          }
        },
        $set: { lastUpdated: new Date() }
      },
      { upsert: true, new: true }
    );
    return stats;
  } catch (error) {
    console.error("Error incrementing form view:", error);
    throw error;
  }
};

const getFormStats = async (formId) => {
  try {
    const stats = await FormStat.findOne({ formId });
    const responses = await FormResponse.find({ formId });
    
    const uniqueStarts = await FormResponse.distinct('sessionId', { formId });
    const completed = await FormResponse.countDocuments({ 
      formId, 
      status: 'completed' 
    });

    return {
      views: stats?.views || 0,
      uniqueViews: stats?.uniqueViews.length || 0,
      starts: uniqueStarts.length,
      completed,
      completionRate: uniqueStarts.length ? 
        Math.round((completed / uniqueStarts.length) * 100) : 0,
      responses: responses
    };
  } catch (error) {
    console.error("Error getting form stats:", error);
    throw error;
  }
};


module.exports = { getFormStats, incrementFormView };