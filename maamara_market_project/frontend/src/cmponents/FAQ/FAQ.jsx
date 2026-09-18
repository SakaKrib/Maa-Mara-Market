import { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  TextField,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Header from "../../Header/Header";
import { tokens } from "../../theme";
import api from "../../Services/Api"; // 🔹 your Django API service
import { baseUrl } from "../../cmponents/Constant/Constant";

const FAQ = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editedAnswer, setEditedAnswer] = useState("");

  // 🔹 Fetch FAQs from Django
  useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const response = await api.get(`${baseUrl}/api/faqs/`);
        setFaqs(response.data || []);
      } catch (err) {
        console.error("Failed to fetch FAQs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  // 🔹 Save edited FAQ back to Django
  const handleSave = async (id) => {
    try {
      await api.put(`${baseUrl}/api/faqs/${id}/`, { answer: editedAnswer });
      setFaqs((prev) =>
        prev.map((faq) =>
          faq.id === id ? { ...faq, answer: editedAnswer } : faq
        )
      );
      setEditingId(null);
      setEditedAnswer("");
    } catch (err) {
      console.error("Failed to update FAQ:", err);
    }
  };

  return (
    <Box
      m={isMobile ? 1 : 5}
      p={isMobile ? 2 : 4}
      sx={{
        
        width: {
          xs: "calc(100% - 20px)",
          sm: "calc(100% - 40px)",
          md: "calc(100% - 80px)",
        },
        
      }}
    >
      {/* ✅ Fixed Box + Header */}
      <Box
      
        sx={{
            backgroundColor: colors.primary[500],
            borderRadius: "12px",
            boxShadow: 3,
            position: "relative",
          top: {
            xs: "50px",
            sm: "50px",
            md: "50px",
          },
        }}
      >
        <Header title="FAQ" subtitle="Frequently Asked Questions" />
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        faqs.map((faq) => (
          <Accordion
            key={faq.id}
            sx={{
              backgroundColor: colors.primary[500],
              color: colors.gray[100],
              mb: 1,
              borderRadius: "8px",
              "&:before": { display: "none" },
            }}
          >
            <AccordionSummary
              expandIcon={
                <ExpandMoreIcon sx={{ color: colors.blueAccent[200] }} />
              }
            >
              <Typography
                variant="h6"
                color={colors.blueAccent[100]}
                fontWeight={600}
              >
                {faq.question}
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              {editingId === faq.id ? (
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    multiline
                    rows={3}
                    fullWidth
                    value={editedAnswer}
                    onChange={(e) => setEditedAnswer(e.target.value)}
                    variant="outlined"
                    sx={{
                      backgroundColor: colors.primary[400],
                      borderRadius: "6px",
                    }}
                  />
                  <Box display="flex" gap={2}>
                    <Button
                      variant="contained"
                      sx={{ backgroundColor: colors.greenAccent[500] }}
                      onClick={() => handleSave(faq.id)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="outlined"
                      sx={{
                        borderColor: colors.gray[300],
                        color: colors.gray[300],
                      }}
                      onClick={() => {
                        setEditingId(null);
                        setEditedAnswer("");
                      }}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography>{faq.answer || "No answer yet."}</Typography>
                  <Button
                    size="small"
                    sx={{ ml: 2, color: colors.blueAccent[200] }}
                    onClick={() => {
                      setEditingId(faq.id);
                      setEditedAnswer(faq.answer || "");
                    }}
                  >
                    Edit
                  </Button>
                </Box>
              )}
            </AccordionDetails>
          </Accordion>
        ))
      )}
    </Box>
  );
};

export default FAQ;
