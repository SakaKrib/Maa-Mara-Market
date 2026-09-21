from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0015_messaging"),
    ]

    operations = [
        migrations.AlterField(
            model_name="supportmessage",
            name="user",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="support_messages",
                to="auth.user",
            ),
        ),
        migrations.AlterField(
            model_name="supportmessage",
            name="name",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="supportmessage",
            name="subject",
            field=models.CharField(default="General support", max_length=255),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="supportmessage",
            name="category",
            field=models.CharField(blank=True, default="", max_length=120),
        ),
        migrations.AddField(
            model_name="supportmessage",
            name="status",
            field=models.CharField(
                choices=[("pending", "Pending"), ("answered", "Answered")],
                default="pending",
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name="supportmessage",
            name="answered_at",
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
